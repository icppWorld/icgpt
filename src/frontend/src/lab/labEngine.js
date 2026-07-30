// The Prompt Cost Lab experiment runner. Drives the SAME on-chain inference path as
// normal chat (through the icgpt_admin controller), but headlessly and with full
// control of the exact prompt string sent — so it can:
//   1. Warm the fixed prefix ONCE (the one-time cost), then
//   2. Run each variable binding reusing that warm prefix (the recurring per-request
//      cost), harvesting the controller's EXACT per-call cycles_cost / duration_ns.
//
// llama.cpp's prompt-cache prefix-match IS the "rewind": we send `fixedPrefix +
// bindingSuffix` for each trial WITHOUT calling new_chat between trials, so the fixed
// prefix is reused and only the suffix is re-ingested. Trials are serialized (there is
// a single per-user prompt cache).
//
// Cost is EXACT (cycles). Token in/out are ESTIMATED here (Phase B adds exact counts).
import {
  makeControllerActor,
  buildNewChatInput,
  buildInstructTurnPrompt,
  runUpdateArgs,
  extractReply,
  estimateTokens,
} from '../canisters/llamacpp'
import {
  bindingSets,
  renderTemplate,
  placementEstimate,
  sweepVars,
} from '../common/templateEngine'
import { evalRules } from '../common/quality'

const SAFETY_CAP = 2000 // max run_update calls per prompt (guard against runaways)

function recOf(res) {
  return 'Ok' in res ? res.Ok : res.Err
}

// Run one prompt through the controller: ingest it, and (if generate) keep generating
// until EOG / maxTokens. Returns exact aggregated cost + timing + the clean reply.
// When generate=false we STOP as soon as the prompt is fully ingested (cache warm-up).
async function runPrompt(
  actor,
  model,
  params,
  promptText,
  { generate, maxTokens }
) {
  let cyclesCost = 0
  let durationNs = 0
  let calls = 0
  let conversation = ''
  let response = null

  for (let step = 0; step < SAFETY_CAP; step += 1) {
    const generating =
      response && 'Ok' in response && response.Ok.prompt_remaining === ''
    if (!generate && generating) break // warm-up: prompt fully ingested, stop

    response = await actor.run_update(
      runUpdateArgs(promptText, generating, model, params)
    )
    calls += 1
    const rec = recOf(response)
    cyclesCost += Number((rec && rec.cycles_cost) || 0n)
    if (!('Ok' in response)) {
      throw new Error(
        'run_update failed: ' + ((rec && rec.error) || 'unknown error')
      )
    }
    if (response.Ok.conversation) conversation = response.Ok.conversation

    if (generating) {
      durationNs += Number(response.Ok.duration_ns || 0n)
      const replySoFar = extractReply(conversation, model)
      if (estimateTokens(replySoFar) >= maxTokens) break
      if (response.Ok.generated_eog) break
    }
  }

  const reply = extractReply(conversation, model)
  return {
    cyclesCost,
    durationNs,
    calls,
    reply,
    genTokensEst: estimateTokens(reply),
  }
}

// Run a full experiment: warm the fixed prefix once, then sweep every binding
// kSamples times, evaluating quality. `onProgress({done,total,label})` is called as it
// goes; `signal` (an AbortSignal-like {aborted}) cancels between trials.
export async function runExperiment({
  authClient,
  template,
  model,
  params,
  kSamples = 1,
  onProgress = () => {},
  signal = { aborted: false },
}) {
  const actor = await makeControllerActor(authClient)
  const maxTokens = Number(params.maxTokens) || 512

  const bindings = bindingSets(template.vars)
  const runBindings = bindings.length ? bindings : [{}]
  const hasSweep = sweepVars(template.vars).length > 0
  const placement = placementEstimate(template, model, params)
  const total = runBindings.length * kSamples

  // Reset the on-chain prompt cache for a clean, cold start.
  onProgress({ done: 0, total, label: 'Starting a fresh in-canister cache…' })
  const nc = await actor.new_chat(model.gguf, buildNewChatInput(model))
  if (!('Ok' in nc)) {
    throw new Error('new_chat failed: ' + (recOf(nc)?.error || 'unknown'))
  }
  let oneTime = { cyclesCost: 0, durationNs: 0, calls: 0 }

  // Warm the fixed prefix (everything before the first swept variable) ONCE.
  if (hasSweep && placement && placement.cacheBreakChar > 0) {
    onProgress({
      done: 0,
      total,
      label: 'Warming the fixed prefix (one-time)…',
    })
    const full = buildInstructTurnPrompt(
      '',
      renderTemplate(template.userTemplate, runBindings[0]),
      renderTemplate(template.systemTemplate, runBindings[0]),
      model,
      params
    )
    const prefix = full.slice(0, placement.cacheBreakChar)
    oneTime = await runPrompt(actor, model, params, prefix, {
      generate: false,
      maxTokens,
    })
  }

  const results = []
  let done = 0
  for (let bi = 0; bi < runBindings.length; bi += 1) {
    if (signal.aborted) break
    const binding = runBindings[bi]
    const prompt = buildInstructTurnPrompt(
      '',
      renderTemplate(template.userTemplate, binding),
      renderTemplate(template.systemTemplate, binding),
      model,
      params
    )
    const samples = []
    for (let k = 0; k < kSamples; k += 1) {
      if (signal.aborted) break
      onProgress({
        done,
        total,
        label: `Trial ${bi + 1}/${runBindings.length}${
          kSamples > 1 ? ` · sample ${k + 1}/${kSamples}` : ''
        }`,
      })
      // Vary the seed across samples so a K-sample pass-rate is meaningful.
      const runParams = kSamples > 1 ? { ...params, seed: null } : params
      const run = await runPrompt(actor, model, runParams, prompt, {
        generate: true,
        maxTokens,
      })
      const quality = evalRules(template.quality, run.reply, binding)
      // An empty reply is not a valid answer — don't let it vacuously "pass" (a
      // notContains rule is trivially true on empty text). Small on-chain models
      // sometimes emit an immediate end-of-turn; count that as a failed trial, flagged.
      const empty = !run.reply.trim()
      if (empty) quality.pass = false
      samples.push({ ...run, quality, empty })
      done += 1
    }
    results.push(summarizeBinding(binding, samples, placement))
  }

  const steadyState = meanCost(results.map((r) => r.meanCyclesCost))
  onProgress({ done, total, label: 'Done.' })
  return {
    template: { id: template.id, name: template.name },
    model: model.id,
    params,
    kSamples,
    placement,
    oneTimeCyclesCost: oneTime.cyclesCost,
    oneTimeCalls: oneTime.calls,
    steadyStateCyclesCost: steadyState,
    bindings: results,
    aborted: signal.aborted,
  }
}

function summarizeBinding(binding, samples, placement) {
  const costs = samples.map((s) => s.cyclesCost)
  const passes = samples.filter((s) => s.quality.pass === true).length
  const fails = samples.filter((s) => s.quality.pass === false).length
  const pending = samples.filter((s) => s.quality.pass === null).length
  const empties = samples.filter((s) => s.empty).length
  return {
    binding,
    samples,
    empties,
    meanCyclesCost: meanCost(costs),
    meanDurationNs: meanCost(samples.map((s) => s.durationNs)),
    meanGenTokensEst: Math.round(meanCost(samples.map((s) => s.genTokensEst))),
    estReingestTokens: placement ? placement.estReingestTokens : null,
    passes,
    fails,
    pending,
    // programmatic pass-rate over resolved samples (null if all manual/pending)
    passRate: passes + fails > 0 ? passes / (passes + fails) : null,
  }
}

function meanCost(nums) {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
