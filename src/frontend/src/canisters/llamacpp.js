// Functions to interact with the llama_cpp_canister (Qwen2.5 Instruct chat, and
// the Raw-LLM "Charles" continuation mode).
//
// Multi-turn: the canister keeps the conversation in its prompt cache
// (--prompt-cache-all). To continue a conversation we resend the growing
// conversation as the prompt; the canister prefix-matches its cache and only
// ingests the new turn. new_chat (cache reset) fires ONLY on the first message
// of a fresh conversation. See the "multi-turn chat" plan.

const IC_HOST_URL = process.env.IC_HOST_URL

// The KV cache quantization the model was loaded with (`load_model`). It must be
// passed to new_chat & run_update so the session's prompt cache matches the model.
const CACHE_TYPE_K = 'q8_0'

// Sampling settings recommended on the Qwen2.5 model card
const TEMP = '0.6'
const REPEAT_PENALTY = '1.1'

// The Qwen chat template pieces
const SYSTEM_PROMPT =
  '<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n'

// Special tokens llama.cpp emits with `-sp`. We strip them from what the user
// SEES, but keep them in the conversation base (from the canister's `conversation`
// field) so the next turn's cache prefix still matches exactly.
const SPECIAL_TOKEN_RE = /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/g
function stripSpecialTokens(s) {
  return s.replace(SPECIAL_TOKEN_RE, '')
}

const DEBUG = true

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// -----------------------------------------------------------------------------
// Prompt building

function buildNewChatInput() {
  return {
    args: [
      '--prompt-cache',
      'my_cache/prompt.cache',
      '--cache-type-k',
      CACHE_TYPE_K,
    ],
  }
}

// The full prompt for ONE turn. First turn: system + user. Later turns: the
// canister's previous `conversation` (which already holds system + all prior
// turns) + the new user turn. Ends with the assistant tag so the LLM continues
// as the assistant.
function buildInstructTurnPrompt(conversationBase, userMessage) {
  const base = conversationBase || SYSTEM_PROMPT
  return (
    base +
    '<|im_start|>user\n' +
    userMessage +
    '<|im_end|>\n' +
    '<|im_start|>assistant\n'
  )
}

// run_update args. Ingestion (generating=false): resend the turn prompt, -n 1 so
// no new tokens are generated yet. Generation (generating=true): empty prompt,
// -n 512 so it generates until EOG. The canister caps -n at max_tokens_update.
function runUpdateArgs(turnPrompt, generating) {
  return {
    args: [
      '--prompt-cache',
      'my_cache/prompt.cache',
      '--prompt-cache-all',
      '--cache-type-k',
      CACHE_TYPE_K,
      '--temp',
      TEMP,
      '--repeat-penalty',
      REPEAT_PENALTY,
      '-sp',
      '-p',
      generating ? '' : turnPrompt,
      '-n',
      generating ? '512' : '1',
    ],
  }
}

// -----------------------------------------------------------------------------
// Retry transient failures of the on-chain calls.
//
// A call to the canister can fail at the transport level: a network blip, a
// boundary-node 429/503, a request timeout, or - only on the local replica - the
// fetchRootKey certificate race. These are transient: the canister was either
// never reached or its reply was lost, so retrying is safe and usually succeeds.
//
// Application-level errors are NOT retried here: the canister returns those as
// `{ Err }` in a SUCCESSFUL response (eg. access denied, model not loaded), not
// as a thrown exception, so callers still handle those as final.
const RETRY_MAX_ATTEMPTS = 4
const RETRY_BASE_DELAY_MS = 500
const RETRY_MAX_DELAY_MS = 8000

// Returns { result, durationMs }, where durationMs times ONLY the successful
// attempt (no backoff), which is what the streaming pace budget wants.
async function withRetry(fn, label, onRetry) {
  for (let attempt = 1; ; attempt += 1) {
    const startedMs = performance.now()
    try {
      const result = await fn()
      return { result, durationMs: performance.now() - startedMs }
    } catch (error) {
      if (attempt >= RETRY_MAX_ATTEMPTS) {
        console.error(
          `withRetry [${label}] gave up after ${attempt} attempts: ${error.message}`
        )
        throw error
      }
      const delayMs = Math.min(
        RETRY_MAX_DELAY_MS,
        RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      )
      console.warn(
        `withRetry [${label}] attempt ${attempt} failed (${error.message}); retrying in ${delayMs}ms`
      )
      if (onRetry) onRetry(attempt, delayMs)
      await sleep(delayMs)
    }
  }
}

const notifyRetry = (setWaitAnimationMessage) => (attempt) =>
  setWaitAnimationMessage(
    `The on-chain LLM is busy, retrying (attempt ${attempt})...`
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
function estimateTokens(text) {
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.round(words * 1.35)
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
  finetuneType,
}) {
  if (DEBUG) console.log('DEBUG-FLOW: fetchInference for message:', userMessage)

  const isInstruct = finetuneType === 'Instruct'

  resetStreamState()
  setChatOutputText('') // clear the in-progress assistant bubble
  setChatDisplay('WaitAnimation')

  // Start the steady painter; it drains pendingText as the loop fills it.
  const painterDone = runPainter(setChatOutputText)

  let fullReply = '' // the assistant reply (special tokens stripped)
  let conversationText = conversationBaseRef.current

  // Reset the canister prompt cache ONLY on the first message of a conversation.
  if (chatNew) {
    setWaitAnimationMessage('Starting a new on-chain conversation')
    const { result: responseNewChat } = await withRetry(
      () => actor.new_chat(buildNewChatInput()),
      'new_chat',
      notifyRetry(setWaitAnimationMessage)
    )
    setStats((s) => ({ ...s, updateCalls: s.updateCalls + 1 }))
    if (!('Ok' in responseNewChat)) {
      let ermsg = ''
      if ('Err' in responseNewChat && 'Other' in responseNewChat.Err)
        ermsg = responseNewChat.Err.Other
      throw new Error('Call to new_chat failed: ' + ermsg)
    }
    // Raw-LLM (Charles) mode: echo the user's prompt as the start of the stream.
    if (!isInstruct) {
      pendingText += userMessage
      fullReply += userMessage
    }
  }

  // The prompt for this turn. Instruct: conversation base + new user turn.
  // Raw-LLM: the user's text is the seed to continue.
  const turnPrompt = isInstruct
    ? buildInstructTurnPrompt(conversationBaseRef.current, userMessage)
    : userMessage

  let responseUpdate = null
  for (let step = 0; step < numSteps; step += 1) {
    const generating =
      responseUpdate &&
      'Ok' in responseUpdate &&
      responseUpdate.Ok.prompt_remaining === ''

    setWaitAnimationMessage(
      generating
        ? 'On-chain token generation in progress'
        : 'On-chain token ingestion in progress'
    )

    const { result, durationMs } = await withRetry(
      () => actor.run_update(runUpdateArgs(turnPrompt, generating)),
      'run_update',
      notifyRetry(setWaitAnimationMessage)
    )
    responseUpdate = result
    setStats((s) => ({ ...s, updateCalls: s.updateCalls + 1 }))

    if (!('Ok' in responseUpdate)) {
      let ermsg = ''
      if ('Err' in responseUpdate) ermsg = responseUpdate.Err.error
      throw new Error('Call to run_update failed: ' + ermsg)
    }

    // Only a generating call's output is real new text to display. The last
    // ingestion call (-n 1) emits 1 token that the first generation call
    // re-emits, so displaying it here would double-print the first word.
    if (generating) {
      const chunk = stripSpecialTokens(responseUpdate.Ok.output)
      pendingText += chunk
      fullReply += chunk
      genTotalMs += durationMs
      genTotalWords += chunk.split(/\s+/).filter(Boolean).length
      const tok = estimateTokens(chunk)
      setStats((s) => ({
        ...s,
        tokens: s.tokens + tok,
        genMs: s.genMs + durationMs,
      }))
    }

    if (responseUpdate.Ok.conversation) {
      conversationText = responseUpdate.Ok.conversation
    }

    if (responseUpdate.Ok.generated_eog) {
      if (DEBUG) console.log('DEBUG-FLOW: EOG reached')
      break
    }
  }

  // Let the painter finish streaming what is buffered, then settle the turn.
  generationDone = true
  await painterDone

  if (isInstruct) {
    const reply = stripSpecialTokens(fullReply).trim()
    // Move the completed assistant reply from the streaming bubble into the
    // conversation, and clear the streaming bubble in the same tick.
    setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    setChatOutputText('')
    // The canister's conversation is the exact cache prefix for the next turn.
    setConversationBase(conversationText)
    setChatNew(false) // subsequent submits CONTINUE this conversation
  }

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
  modelType,
  modelSize,
  finetuneType,
}) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: doSubmitLlamacpp', {
      modelType,
      modelSize,
      finetuneType,
      chatNew,
    })
  }

  const userMessage = inputString.trim()
  if (userMessage === '') return

  setIsSubmitting(true)

  const numSteps = 1000 // safety cap on the ingest+generate loop
  const moduleToImport = import('DeclarationsCanisterLlamacpp_Qwen25_05B_Q8')
  const { canisterId, createActor } = await moduleToImport

  // Create the actor on the first message; reuse it for continuation turns (it
  // already has the root key, avoiding the local fetchRootKey race).
  let actor_ = actorRef.current
  if (chatNew || !actor_) {
    const identity = await authClient.getIdentity()
    actor_ = createActor(canisterId, {
      agentOptions: { identity, host: IC_HOST_URL },
    })
    setActorRef(actor_)
  }

  // Show the user's message immediately, and clear the input box.
  if (finetuneType === 'Instruct') {
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
  }
  setInputString('')

  try {
    setChatDisplay('WaitAnimation')
    setWaitAnimationMessage('On-chain token ingestion in progress')
    const { result: responseHealth } = await withRetry(
      () => actor_.health(),
      'health',
      notifyRetry(setWaitAnimationMessage)
    )

    if (!('Ok' in responseHealth)) {
      let ermsg = ''
      if ('Err' in responseHealth && 'Other' in responseHealth.Err)
        ermsg = responseHealth.Err.Other
      throw new Error('The on-chain LLM is not healthy: ' + ermsg)
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
      finetuneType,
    })
  } catch (error) {
    console.error(error)
    setChatDone(true)
    setChatDisplay('CanisterError')
  } finally {
    setWaitAnimationMessage('Calling the on-chain LLM')
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
  if (setStats) setStats({ updateCalls: 0, tokens: 0, genMs: 0 })
  setChatDisplay('SelectModel')
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

  const { canisterId, createActor } = await import(
    'DeclarationsCanisterLlamacpp_Qwen25_05B_Q8'
  )
  const identity = await authClient.getIdentity()
  const actor_ = createActor(canisterId, {
    agentOptions: { identity, host: IC_HOST_URL },
  })
  setActorRef(actor_)

  try {
    setWaitAnimationMessage('Retrieving your chats from on-chain storage')
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
      throw new Error('The on-chain LLM is not healthy: ' + ermsg)
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
    setWaitAnimationMessage('Calling the on-chain LLM')
    setChatDisplay('ChatOutput')
  }
}
