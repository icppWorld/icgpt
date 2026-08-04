// Functions to interact with the Qwen Instruct chat.
//
// HARD GATE: inference is routed through the icgpt_admin CONTROLLER canister, not
// the llama_cpp canister directly (which is locked to controllers-only). The
// controller mirrors new_chat/run_update/health, checks the access gate + isolates
// each user's prompt cache, then forwards to the LLM. The streaming loop below is
// unchanged - it still paints each run_update's output as it arrives.
//
// Multi-turn: the LLM keeps the conversation in its prompt cache
// (--prompt-cache-all). To continue a conversation we resend the growing
// conversation as the prompt; it prefix-matches the cache and only ingests the new
// turn. new_chat (cache reset) fires ONLY on the first message of a fresh conversation.
import { idlFactory as controllerIdlFactory } from './idl/icgpt_admin.idl.js'
import { withRetry, classifyInferenceError } from './retry'
import { logClientEvent } from './admin'
import { canisterIdFor, makeActor } from './agent'

const CONTROLLER_CANISTER_ID = canisterIdFor('icgpt_admin')

// A new_chat/run_update response reports a TRANSIENT "not ready" failure as { Err } with a
// status_code/error (the controller tags infra failures 503, permanent gate errors 403). Fed
// to withRetry's shouldRetryResult so those are retried with backoff; permanent errors are not.
function isRetryableInference(response) {
  if (!response || 'Ok' in response) return false
  const rec = response.Err
  return rec ? classifyInferenceError(rec.status_code, rec.error) : false
}

// Build an actor for the controller canister (which exposes new_chat/run_update/
// health). Built from the committed idlFactory + @icp-sdk/core (see ./agent.js);
// the canister id + root key come from the ic_env cookie.
export function makeControllerActor(authClient) {
  return makeActor(controllerIdlFactory, CONTROLLER_CANISTER_ID, authClient)
}

// The Qwen chat template pieces. The system prompt TEXT is user-configurable
// (the system-prompt test bed); we wrap the chosen text in the template here.
const DEFAULT_SYSTEM_PROMPT_TEXT = 'You are a helpful assistant.'

// Chat-template families. Qwen models use ChatML (a real `system` role + Qwen3's
// hybrid thinking mode); Gemma 3 uses its own template with NO system role and no
// thinking. Each model's `inference.promptFormat` selects one ('chatml' is the
// default when absent). `-sp` makes the canister emit these control tokens in the
// `conversation` field, so we keep them in the cache prefix (for exact next-turn
// matching) but strip them from what the user SEES.
const TEMPLATES = {
  chatml: {
    // ChatML control tokens + Qwen3 <think> tags (stripped from displayed text).
    specialTokenRe:
      /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>|<think>|<\/think>/g,
    // The marker after which the CURRENT turn's reply begins, in `conversation`.
    assistantMarker: '<|im_start|>assistant\n',
    // Full prompt for ONE turn, appended onto `base` (the canister's prior
    // `conversation`, or '' on the first turn — where we synthesize the system block).
    buildTurn(base, userMessage, systemPromptText, model, params) {
      const b =
        base ||
        '<|im_start|>system\n' +
          (systemPromptText ?? DEFAULT_SYSTEM_PROMPT_TEXT) +
          '<|im_end|>\n'
      // Qwen3 hybrid: thinking OFF (default) => an empty <think></think> block forces
      // non-thinking (clean answers); thinking ON (or a non-hybrid model) => plain open.
      const nonThinking = model.inference.supportsThinking && !params.thinking
      const assistantOpen = nonThinking
        ? '<|im_start|>assistant\n<think>\n\n</think>\n\n'
        : '<|im_start|>assistant\n'
      return (
        b + '<|im_start|>user\n' + userMessage + '<|im_end|>\n' + assistantOpen
      )
    },
  },
  gemma: {
    // Gemma 3 control tokens (no <think> — not a thinking model).
    specialTokenRe: /<start_of_turn>|<end_of_turn>|<eos>|<bos>/g,
    assistantMarker: '<start_of_turn>model\n',
    buildTurn(base, userMessage, systemPromptText) {
      // Gemma has NO system role. On the FIRST turn (empty base) fold the system
      // prompt into the user message; later turns just append the user turn. The
      // model turn opens with <start_of_turn>model (not assistant) and turns end
      // with <end_of_turn>. No thinking mode.
      const sys = systemPromptText ?? DEFAULT_SYSTEM_PROMPT_TEXT
      const userText = !base && sys ? sys + '\n\n' + userMessage : userMessage
      return (
        (base || '') +
        '<start_of_turn>user\n' +
        userText +
        '<end_of_turn>\n' +
        '<start_of_turn>model\n'
      )
    },
  },
}

function templateFor(model) {
  return TEMPLATES[model?.inference?.promptFormat] || TEMPLATES.chatml
}

function stripSpecialTokens(s, model) {
  return s.replace(templateFor(model).specialTokenRe, '')
}

// The assistant's reply for the CURRENT turn, extracted from the canister's canonical
// `conversation` text: everything after the last model/assistant-turn marker, with
// special tokens stripped and leading whitespace trimmed. Streaming the delta of this
// across run_update calls (see fetchInference) avoids the per-call boundary repeat and
// works uniformly for every model/template. For a non-thinking Qwen3 turn the marker is
// followed by an empty <think>\n\n</think>\n\n block (stripped here); for a thinking turn
// the model's <think>…</think> reasoning shows before the answer.
export function extractReply(conversation, model) {
  const marker = templateFor(model).assistantMarker
  const idx = conversation.lastIndexOf(marker)
  const raw = idx >= 0 ? conversation.slice(idx + marker.length) : ''
  return stripSpecialTokens(raw, model).replace(/^\s+/, '')
}

const DEBUG = true

// -----------------------------------------------------------------------------
// Prompt building

// The KV-cache quantization args must match how the canister loaded the model, so
// they come from the selected model's config (both q8_0 for the 16K-context setup).
function cacheTypeArgs(model) {
  const inf = model.inference
  const args = ['--cache-type-k', inf.cacheTypeK]
  if (inf.cacheTypeV) args.push('--cache-type-v', inf.cacheTypeV)
  return args
}

export function buildNewChatInput(model) {
  return {
    args: ['--prompt-cache', 'my_cache/prompt.cache', ...cacheTypeArgs(model)],
  }
}

// The full prompt for ONE turn, delegated to the model's chat template (see
// TEMPLATES). First turn: system + user (ChatML) or system-folded-into-user (Gemma).
// Later turns: the canister's previous `conversation` (which already holds all prior
// turns) + the new user turn, ending with the model/assistant-turn opener. The system
// prompt only appears on the first turn (empty conversationBase), so switching it
// requires a New chat to take effect.
export function buildInstructTurnPrompt(
  conversationBase,
  userMessage,
  systemPromptText,
  model,
  params
) {
  return templateFor(model).buildTurn(
    conversationBase,
    userMessage,
    systemPromptText,
    model,
    params
  )
}

// Map the user's Parameters-panel values to llama.cpp run_update flags. All values
// are stringified (the canister takes a vec of text). NOTE: any flag the deployed
// llama.cpp build does not accept must be dropped here (verify before shipping).
function samplingArgs(params) {
  const args = [
    '--temp',
    String(params.temp),
    '--top-p',
    String(params.topP),
    '--top-k',
    String(params.topK),
    '--min-p',
    String(params.minP),
    '--repeat-penalty',
    String(params.repeatPenalty),
    '--repeat-last-n',
    String(params.repeatLastN),
  ]
  // Seed: pass only when locked to a number; random => let the model pick.
  if (params.seed !== null && params.seed !== undefined && params.seed !== '') {
    args.push('--seed', String(params.seed))
  }
  // Advanced penalties: emit only when non-zero (0 = the disabled default), so the
  // common path never sends them (and a build that rejects them only affects users
  // who set them).
  if (Number(params.presencePenalty)) {
    args.push('--presence-penalty', String(params.presencePenalty))
  }
  if (Number(params.frequencyPenalty)) {
    args.push('--frequency-penalty', String(params.frequencyPenalty))
  }
  return args
}

// run_update args. Ingestion (generating=false): resend the turn prompt, -n 1 so
// no new tokens are generated yet. Generation (generating=true): empty prompt,
// -n 512 so it generates in batches. The canister caps -n per call at
// max_tokens_update; the app loop enforces the user's total max-length.
export function runUpdateArgs(turnPrompt, generating, model, params) {
  return {
    args: [
      '--prompt-cache',
      'my_cache/prompt.cache',
      '--prompt-cache-all',
      ...cacheTypeArgs(model),
      ...samplingArgs(params),
      '-sp',
      '-p',
      generating ? '' : turnPrompt,
      '-n',
      generating ? '512' : '1',
    ],
  }
}

// Index of the earliest stop-sequence hit in `text`, or -1. Empty stops ignored.
function firstStopIndex(text, stops) {
  let best = -1
  for (const s of stops || []) {
    if (!s) continue
    const i = text.indexOf(s)
    if (i >= 0 && (best < 0 || i < best)) best = i
  }
  return best
}

// -----------------------------------------------------------------------------
// Transient on-chain calls are retried with exponential backoff via the shared
// `withRetry` (see ./retry). notifyRetry surfaces those retries in the chat UI.
const notifyRetry = (setWaitAnimationMessage) => (attempt) =>
  setWaitAnimationMessage(
    `The in-canister LLM is busy, retrying (attempt ${attempt})...`
  )

// -----------------------------------------------------------------------------
// Smooth streaming: a word buffer + a steady painter.
//
// The canister generates in bursts (~25 tokens per ~2-3s update call, with a
// round-trip gap between calls). If we paint each burst as fast as it arrives,
// the text bursts then stalls while the next burst is generated. Instead we
// paint at the SUSTAINED generation rate (measured ms-per-word), so painting one
// burst takes about as long as generating the next one - continuous, no stall.
//
// `pendingText` is the unpainted raw suffix; the painter moves it word-by-word
// into chatOutputText, so `displayed + pendingText` always equals the exact
// generated text so far (never transformed, only moved).
const MIN_WORD_DELAY_MS = 30
// MAX is deliberately high: on the local replica the canister generates ~10x
// slower than the IC (~30s per 25-token call vs ~2.5s), so to stay CONTINUOUS
// (no burst-then-stall) the painter must be allowed to slow down to the actual
// generation rate. On the IC the sustained rate is ~150ms/word, so this ceiling
// never binds there - it just keeps local streaming smooth instead of bursty.
const MAX_WORD_DELAY_MS = 2000
const DEFAULT_WORD_DELAY_MS = 300 // first batch, before we have throughput stats
const CATCHUP_WORD_DELAY_MS = 40 // brisk drain of the tail once generation is done
const BUFFER_POLL_MS = 60 // recheck cadence while waiting for more tokens

let pendingText = ''
let generationDone = false
let genTotalMs = 0
let genTotalWords = 0

function resetStreamState() {
  pendingText = ''
  generationDone = false
  genTotalMs = 0
  genTotalWords = 0
}

// Paint at the SUSTAINED generation rate (measured ms-per-word), so painting one
// burst takes about as long as generating the next one - continuous, no stall.
// Once generation is done, drain whatever is buffered briskly so the tail does
// not drag.
function currentWordDelayMs() {
  if (generationDone) return CATCHUP_WORD_DELAY_MS
  if (genTotalWords <= 0) return DEFAULT_WORD_DELAY_MS
  const perWord = genTotalMs / genTotalWords
  return Math.min(MAX_WORD_DELAY_MS, Math.max(MIN_WORD_DELAY_MS, perWord))
}

// Pop the next word-unit (leading whitespace + one word + its trailing
// whitespace) to paint, or null to wait. We require the word to be whitespace-
// terminated so we never paint a word that is split across two bursts - unless
// `flush` (generation done), where we paint the remaining tail.
function nextWordUnit(flush) {
  if (pendingText === '') return null
  const m = pendingText.match(/^\s*\S+\s+/)
  if (m) {
    pendingText = pendingText.slice(m[0].length)
    return m[0]
  }
  if (flush) {
    const rest = pendingText
    pendingText = ''
    return rest
  }
  return null
}

// Steady painter. Resolves when the buffer is fully drained AND generation is
// done. Runs concurrently with the inference loop that fills pendingText.
function runPainter(setChatOutputText) {
  return new Promise((resolve) => {
    const tick = () => {
      const unit = nextWordUnit(generationDone)
      if (unit !== null) {
        setChatOutputText((prev) => prev + unit)
        setTimeout(tick, currentWordDelayMs())
        return
      }
      if (generationDone && pendingText === '') {
        resolve()
        return
      }
      setTimeout(tick, BUFFER_POLL_MS)
    }
    tick()
  })
}

// -----------------------------------------------------------------------------
// Inference: run one user turn (ingest the prompt, then generate to EOG).

// Rough token estimate from word count (~1.35 tokens/word for English). The
// canister does not report exact token counts, so this is clearly approximate.
export function estimateTokens(text) {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.round(words * 1.35)
}

// Unwrap one candid `opt nat64` (JS: [] | [bigint]) to a Number, or null if absent.
function optNat(v) {
  return Array.isArray(v) && v.length ? Number(v[0]) : null
}

// Read the EXACT token accounting off a run_update/run_query Ok record
// (llama_cpp_canister >= v0.15.0, flowed through the icgpt_admin controller). Every
// field is `opt` — null when the canister/wasm predates v0.15.0 or on a non-success
// record — so the Lab falls back to character estimates when any is null.
//   total     = prompt tokens presented this call
//   cached    = prompt-cache hit (reused free, NOT decoded) = the cache-break offset
//   decoded   = prompt tokens actually decoded (ingested) this call
//   generated = tokens generated this call
//   remaining = prompt tokens not yet ingested (capped by max_tokens per call)
export function tokenCounts(okRec) {
  if (!okRec) return null
  return {
    total: optNat(okRec.n_prompt_tokens),
    cached: optNat(okRec.n_prompt_tokens_cached),
    decoded: optNat(okRec.n_prompt_tokens_decoded),
    generated: optNat(okRec.n_tokens_generated),
    remaining: optNat(okRec.n_prompt_tokens_remaining),
  }
}

async function fetchInference({
  actor,
  chatNew,
  setChatNew,
  setChatDone,
  setChatDisplay,
  setWaitAnimationMessage,
  setChatOutputText,
  setMessages,
  setInputPlaceholder,
  setStats,
  conversationBaseRef,
  setConversationBase,
  userMessage,
  numSteps,
  systemPromptText,
  selectedModel,
  params,
}) {
  if (DEBUG) console.log('DEBUG-FLOW: fetchInference for message:', userMessage)

  resetStreamState()
  setChatOutputText('') // clear the in-progress assistant bubble
  setChatDisplay('WaitAnimation')

  // Start the steady painter; it drains pendingText as the loop fills it.
  const painterDone = runPainter(setChatOutputText)

  let fullReply = '' // the assistant reply (special tokens stripped)
  let conversationText = conversationBaseRef.current

  // Reset the canister prompt cache ONLY on the first message of a conversation.
  if (chatNew) {
    setWaitAnimationMessage('Starting a new in-canister conversation')
    const { result: responseNewChat } = await withRetry(
      () =>
        actor.new_chat(selectedModel.gguf, buildNewChatInput(selectedModel)),
      'new_chat',
      notifyRetry(setWaitAnimationMessage),
      isRetryableInference
    )
    const ncRec =
      'Ok' in responseNewChat ? responseNewChat.Ok : responseNewChat.Err
    setStats((s) => ({
      ...s,
      updateCalls: s.updateCalls + 1,
      cyclesCost: s.cyclesCost + (ncRec ? Number(ncRec.cycles_cost || 0n) : 0),
    }))
    if (!('Ok' in responseNewChat)) {
      // Err is a RunOutputRecord (its .error carries the controller's gate/quota
      // message), so read .error - matching the run_update error handling below.
      const ermsg =
        'Err' in responseNewChat ? responseNewChat.Err.error || '' : ''
      throw new Error(ermsg || 'Call to new_chat failed')
    }
  }

  // The prompt for this turn: conversation base (system + all prior turns) + the
  // new user turn.
  const turnPrompt = buildInstructTurnPrompt(
    conversationBaseRef.current,
    userMessage,
    systemPromptText,
    selectedModel,
    params
  )

  // tokens IN = what is NEWLY ingested this turn = the turn prompt minus the
  // cached conversation prefix (which the canister reuses, not re-ingests).
  // First turn: includes the system prompt. Approximate, like tokens OUT.
  const tokensInDelta =
    estimateTokens(turnPrompt) - estimateTokens(conversationBaseRef.current)
  setStats((s) => ({ ...s, tokensIn: s.tokensIn + Math.max(0, tokensInDelta) }))

  let responseUpdate = null
  for (let step = 0; step < numSteps; step += 1) {
    const generating =
      responseUpdate &&
      'Ok' in responseUpdate &&
      responseUpdate.Ok.prompt_remaining === ''

    setWaitAnimationMessage(
      generating
        ? 'In-canister token generation in progress'
        : 'In-canister token ingestion in progress'
    )

    const { result, durationMs } = await withRetry(
      () =>
        actor.run_update(
          runUpdateArgs(turnPrompt, generating, selectedModel, params)
        ),
      'run_update',
      notifyRetry(setWaitAnimationMessage),
      isRetryableInference
    )
    responseUpdate = result
    // Exact per-call cycle cost, measured on-chain by the controller (both Ok and
    // Err arms carry it). Accrue it for every call (ingestion + generation).
    const rec = 'Ok' in responseUpdate ? responseUpdate.Ok : responseUpdate.Err
    const callCycles = rec ? Number(rec.cycles_cost || 0n) : 0
    setStats((s) => ({
      ...s,
      updateCalls: s.updateCalls + 1,
      cyclesCost: s.cyclesCost + callCycles,
    }))

    if (!('Ok' in responseUpdate)) {
      let ermsg = ''
      if ('Err' in responseUpdate) ermsg = responseUpdate.Err.error
      throw new Error('Call to run_update failed: ' + ermsg)
    }

    // Track the canister's canonical `conversation` (the exact cache text, each token
    // stored once): it is both the cache-matching prefix for the next turn AND the
    // source of the text we display (below).
    if (responseUpdate.Ok.conversation) {
      conversationText = responseUpdate.Ok.conversation
    }

    // Derive the newly-shown text from `conversation`, NOT the per-call `output`. Each
    // generation run_update re-emits the PREVIOUS call's last token as its own first
    // token - a fresh sampler per call can't see the prior token, so it is a mechanical
    // call-boundary artifact (--repeat-penalty can't fix it). At the 0.6B's ~20 tokens/
    // call it is nearly invisible; at the 1.7B's 4 tokens/call it is a visible "word
    // word" stutter. `conversation` has no such duplication, so we stream its delta -
    // correct for every model, and it also subsumes the old ingestion->first-generation
    // boundary special-case.
    if (generating) {
      const replyClean = extractReply(conversationText, selectedModel)
      // conversation is append-only, so the reply-so-far starts with what we already
      // showed; paint only the new suffix. (Guard against any divergence: keep
      // fullReply canonical and just skip painting that one call.)
      const chunk = replyClean.startsWith(fullReply)
        ? replyClean.slice(fullReply.length)
        : ''
      fullReply = replyClean
      pendingText += chunk
      genTotalMs += durationMs
      genTotalWords += chunk.split(/\s+/).filter(Boolean).length
      const tok = estimateTokens(chunk)
      // genNs accumulates the controller's EXACT on-chain generation time (IC system
      // time bracketing the LLM call), used for tok/s - excludes network + controller.
      const genNsDelta = Number(responseUpdate.Ok.duration_ns || 0n)
      setStats((s) => ({
        ...s,
        tokensOut: s.tokensOut + tok,
        genNs: s.genNs + genNsDelta,
      }))
    }

    // User halt conditions (only meaningful after a generating call produced text):
    if (generating) {
      // Stop sequence: truncate the reply at the first hit and halt. The hit is in
      // the freshly-generated tail, so trim the same overflow off the unpainted
      // buffer so the painter does not stream past it.
      const stopIdx = firstStopIndex(fullReply, params.stopSequences)
      if (stopIdx >= 0) {
        const overflow = fullReply.length - stopIdx
        fullReply = fullReply.slice(0, stopIdx)
        pendingText =
          pendingText.length >= overflow
            ? pendingText.slice(0, pendingText.length - overflow)
            : ''
        if (DEBUG) console.log('DEBUG-FLOW: stop sequence hit')
        break
      }
      // Max response length (approximate: no exact token count from the canister).
      if (estimateTokens(fullReply) >= params.maxTokens) {
        if (DEBUG) console.log('DEBUG-FLOW: max response length reached')
        break
      }
    }

    if (responseUpdate.Ok.generated_eog) {
      if (DEBUG) console.log('DEBUG-FLOW: EOG reached')
      break
    }
  }

  // Let the painter finish streaming what is buffered, then settle the turn.
  generationDone = true
  await painterDone

  const reply = stripSpecialTokens(fullReply, selectedModel).trim()
  // Move the completed assistant reply from the streaming bubble into the
  // conversation, and clear the streaming bubble in the same tick.
  setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
  setChatOutputText('')
  // The canister's conversation is the exact cache prefix for the next turn.
  setConversationBase(conversationText)
  setChatNew(false) // subsequent submits CONTINUE this conversation

  setChatDone(true)
  setInputPlaceholder('Message ICGPT')
  setChatDisplay('ChatOutput')
}

// -----------------------------------------------------------------------------
// Called when user clicks 'submit'
export async function doSubmitLlamacpp({
  authClient,
  actorRef,
  chatNew,
  setActorRef,
  setChatNew,
  setChatDone,
  inputString,
  setInputString,
  setInputPlaceholder,
  isSubmitting,
  setIsSubmitting,
  setChatOutputText,
  setMessages,
  setStats,
  conversationBaseRef,
  setConversationBase,
  setChatDisplay,
  setWaitAnimationMessage,
  systemPromptText,
  selectedModel,
  params,
}) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: doSubmitLlamacpp', { chatNew })
  }

  const userMessage = inputString.trim()
  if (userMessage === '') return

  setIsSubmitting(true)

  const numSteps = 1000 // safety cap on the ingest+generate loop

  // Create the CONTROLLER actor on the first message; reuse it for continuation
  // turns (it already has the root key, avoiding the local fetchRootKey race).
  let actor_ = actorRef.current
  if (chatNew || !actor_) {
    actor_ = await makeControllerActor(authClient)
    setActorRef(actor_)
  }

  // Show the user's message immediately, and clear the input box.
  setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
  setInputString('')

  try {
    setChatDisplay('WaitAnimation')
    setWaitAnimationMessage('In-canister token ingestion in progress')
    const { result: responseHealth } = await withRetry(
      () => actor_.health(),
      'health',
      notifyRetry(setWaitAnimationMessage)
    )

    if (!('Ok' in responseHealth)) {
      let ermsg = ''
      if ('Err' in responseHealth && 'Other' in responseHealth.Err)
        ermsg = responseHealth.Err.Other
      throw new Error('The in-canister LLM is not healthy: ' + ermsg)
    }

    await fetchInference({
      actor: actor_,
      chatNew,
      setChatNew,
      setChatDone,
      setChatDisplay,
      setWaitAnimationMessage,
      setChatOutputText,
      setMessages,
      setInputPlaceholder,
      setStats,
      conversationBaseRef,
      setConversationBase,
      userMessage,
      numSteps,
      systemPromptText,
      selectedModel,
      params,
    })
  } catch (error) {
    console.error(error)
    // Best-effort: record the failed inference to the on-chain monitoring log for later
    // review (fire-and-forget; a failure here must not mask the original error).
    logClientEvent(
      authClient,
      'chat_inference_failed',
      `${selectedModel?.gguf || '?'}: ${error.message}`
    ).catch(() => {})
    setChatDone(true)
    setChatDisplay('CanisterError')
  } finally {
    setWaitAnimationMessage('Calling the in-canister LLM')
    setIsSubmitting(false)
  }
}

// -----------------------------------------------------------------------------
// Called when user clicks 'New chat'. Lazy cache reset: we only clear the UI +
// conversation state here; the canister prompt cache is reset by the next first
// message's new_chat. The canister's cleanup timer sweeps abandoned caches.
export async function doNewChatLlamacpp({
  setChatNew,
  setChatDone,
  setInputString,
  setInputPlaceholder,
  setChatOutputText,
  setMessages,
  setConversationBase,
  setStats,
  setChatDisplay,
}) {
  if (DEBUG) console.log('DEBUG-FLOW: doNewChatLlamacpp ')
  setChatNew(true)
  setChatDone(false)
  setInputString('')
  if (setInputPlaceholder) setInputPlaceholder('Message ICGPT')
  setChatOutputText('')
  if (setMessages) setMessages([])
  if (setConversationBase) setConversationBase('')
  if (setStats)
    setStats({
      updateCalls: 0,
      tokensIn: 0,
      tokensOut: 0,
      cyclesCost: 0,
      genNs: 0,
    })
  setChatDisplay('ChatOutput')
}

// -----------------------------------------------------------------------------
// Saved chats (Chats button).

// Parse a saved conversation (Qwen template) into ordered {role, content} turns,
// for rendering a loaded chat as bubbles. System turns are skipped.
function parseConversationToMessages(text) {
  const messages = []
  const re = /<\|im_start\|>(user|assistant)\n([\s\S]*?)(?:<\|im_end\|>|$)/g
  let m
  while ((m = re.exec(text)) !== null) {
    const content = m[2].trim()
    if (content) messages.push({ role: m[1], content })
  }
  return messages
}

const convertChatsToChatData = (chats) => {
  return chats.map((chat) => {
    const messages = parseConversationToMessages(chat.chat)
    const firstUser = messages.find((m) => m.role === 'user')
    const inputWords = (firstUser ? firstUser.content : '')
      .split(' ')
      .slice(0, 25)
      .join(' ')
    const dateLabel = chat.timestamp.split('_')[0]
    const label = `(${dateLabel}) ${inputWords}`
    return { label, messages }
  })
}

// Called when user clicks 'Chats'
export async function getChatsLlamacpp({
  authClient,
  setActorRef,
  setChatDisplay,
  setWaitAnimationMessage,
  setChats,
}) {
  if (DEBUG) console.log('DEBUG-FLOW: getChatsLlamacpp ')

  // Import the committed did.js idlFactory directly (see ./idl/). Same @icp-sdk/core
  // actor approach as makeControllerActor above.
  // NOTE: Chats is disabled under the hard gate (the LLM is controllers-only), so this
  // path is dormant; it is kept compiling for when saved-chats returns via the controller.
  const { idlFactory: llmIdlFactory } = await import('./idl/llama_cpp.idl.js')
  const canisterId = canisterIdFor('llama_cpp_qwen25_05b_q8')
  const actor_ = await makeActor(llmIdlFactory, canisterId, authClient)
  setActorRef(actor_)

  try {
    setWaitAnimationMessage('Retrieving your chats from in-canister storage')
    setChatDisplay('WaitAnimation')
    const { result: responseHealth } = await withRetry(
      () => actor_.health(),
      'health',
      notifyRetry(setWaitAnimationMessage)
    )

    if (!('Ok' in responseHealth)) {
      let ermsg = ''
      if ('Err' in responseHealth && 'Other' in responseHealth.Err)
        ermsg = responseHealth.Err.Other
      throw new Error('The in-canister LLM is not healthy: ' + ermsg)
    }

    const { result: responseGetChats } = await withRetry(
      () => actor_.get_chats(),
      'get_chats',
      notifyRetry(setWaitAnimationMessage)
    )
    if ('Ok' in responseGetChats) {
      setChats(convertChatsToChatData(responseGetChats.Ok.chats))
    } else {
      let ermsg = ''
      if ('Err' in responseGetChats && 'Other' in responseGetChats.Err)
        ermsg = responseGetChats.Err.Other
      throw new Error('Call to getChats returns error: ' + ermsg)
    }
  } catch (error) {
    console.error(error)
    setChatDisplay('CanisterError')
  } finally {
    setWaitAnimationMessage('Calling the in-canister LLM')
    setChatDisplay('ChatOutput')
  }
}
