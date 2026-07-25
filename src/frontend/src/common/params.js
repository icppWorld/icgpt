// Inference parameters for the ICGPT Prompt Studio. Users tune the model's
// sampling settings in the Parameters panel (ParametersModal). The values are a
// global "workbench": they persist per-browser in localStorage, survive reload,
// and apply to every generation until changed or reset.
//
// These are PER-CALL sampling args only. Load-time settings (ctx-size, batch,
// KV-cache type) are admin/deployment config and are NOT here. llamacpp.js maps
// these values to llama.cpp `run_update` flags at inference time.
//
// Recommended defaults are tuned for Qwen3-0.6B in non-thinking mode:
// temp 0.7 / top_p 0.8 / top_k 20 / min_p 0. For instruction-following, temp
// 0.4-0.6 is more reliable; repeat_penalty 1.1 prevents looping on a 0.6B;
// min_p lets you raise temp for variety without garbage.

export const RECOMMENDED_PARAMS = {
  // Tier 1 — always visible
  temp: 0.7, // creativity vs. obedience (0.0-2.0)
  maxTokens: 512, // total response token cap, enforced by the app's generate loop
  thinking: false, // Qwen3 hybrid: false = non-thinking (empty <think></think> block)
  seed: null, // null = random each generation; a number = locked/reproducible

  // Tier 2 — "Sampling"
  minP: 0.0, // 0.0-1.0
  topP: 0.8, // 0.0-1.0
  topK: 20, // 0-100 (0 = off)
  repeatPenalty: 1.1, // 1.0-1.5
  repeatLastN: 64, // 0-256
  stopSequences: [], // list of strings; app halts the loop when the output contains one

  // Tier 3 — "Advanced"
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
}

const LS_PARAMS = 'icgpt.params'

// Merge whatever is stored onto a fresh copy of the recommended defaults, so a
// shape change (a new field) can never produce a missing key. Only known keys
// are kept; stored extras are dropped.
export function loadParams() {
  const base = { ...RECOMMENDED_PARAMS }
  try {
    const raw = window.localStorage.getItem(LS_PARAMS)
    if (!raw) return base
    const stored = JSON.parse(raw)
    if (!stored || typeof stored !== 'object') return base
    for (const key of Object.keys(base)) {
      if (key in stored) base[key] = stored[key]
    }
    // Keep stopSequences an array of strings.
    if (!Array.isArray(base.stopSequences)) base.stopSequences = []
    return base
  } catch (e) {
    return base
  }
}

export function saveParams(params) {
  try {
    window.localStorage.setItem(LS_PARAMS, JSON.stringify(params))
  } catch (e) {
    // ignore (e.g. storage disabled) - in-memory state still works this session
  }
}
