// On-chain-backed persistence for the Prompt Cost Lab. The Lab's run history, the
// current report, and the editor setup (selected model, samples/trial, in-progress
// template) are stored per-principal in icgpt_admin as one opaque JSON blob
// (icgpt_admin owns nothing about the shape — see saveLabState/getLabState). This
// module serializes/deserializes that blob and caps the stored run history so it
// stays well under the canister's per-user size limit. Mirrors common/params.js:
// JSON + try/catch + shape-tolerant load (versioning-by-tolerance).

// Keep only the most recent N runs (full generated replies live inside each run's
// bindings, so history is the size driver). The backend also caps the blob size.
const MAX_RUNS = 15

// Serialize { runs, report, editor } to a JSON string for saveLabState. `runs` is
// trimmed to the most recent MAX_RUNS; `report`/`editor` pass through (small).
export function serializeLabState({ runs, report, editor }) {
  const trimmed = Array.isArray(runs) ? runs.slice(-MAX_RUNS) : []
  return JSON.stringify({
    runs: trimmed,
    report: report ?? null,
    editor: editor ?? null,
  })
}

// Parse a getLabState JSON string into { runs, report, editor }, tolerating any
// shape drift — an unknown/old/corrupt blob degrades to empty, never throws.
export function deserializeLabState(json) {
  const empty = { runs: [], report: null, editor: null }
  if (!json) return empty
  try {
    const s = JSON.parse(json)
    if (!s || typeof s !== 'object') return empty
    return {
      runs: Array.isArray(s.runs) ? s.runs.slice(-MAX_RUNS) : [],
      report: s.report && typeof s.report === 'object' ? s.report : null,
      editor: s.editor && typeof s.editor === 'object' ? s.editor : null,
    }
  } catch (e) {
    return empty
  }
}
