// System prompts for the ICGPT test bed. Users pick the built-in Default or
// edit/save up to NUM_CUSTOM_SLOTS custom prompts. The active selection + the
// custom slots persist per-browser in localStorage.
//
// A prompt here is the raw system TEXT only. llamacpp.js wraps it in the Qwen
// chat template (<|im_start|>system ... <|im_end|>) at inference time.

export const DEFAULT_SYSTEM_PROMPT = {
  id: 'default',
  name: 'Default',
  text: 'You are a helpful assistant.',
  builtin: true,
}

export const NUM_CUSTOM_SLOTS = 3

const LS_CUSTOM = 'icgpt.systemPrompts.custom'
const LS_ACTIVE = 'icgpt.systemPrompts.activeId'

function defaultCustomPrompts() {
  return Array.from({ length: NUM_CUSTOM_SLOTS }, (_, i) => ({
    id: `custom-${i + 1}`,
    name: `Custom ${i + 1}`,
    text: '',
  }))
}

// Merge whatever is stored onto a fresh set of slots, so a shape change (e.g. a
// bumped NUM_CUSTOM_SLOTS) can never produce missing/extra slots.
export function loadCustomPrompts() {
  const base = defaultCustomPrompts()
  try {
    const raw = window.localStorage.getItem(LS_CUSTOM)
    if (!raw) return base
    const stored = JSON.parse(raw)
    if (!Array.isArray(stored)) return base
    return base.map((slot) => {
      const s = stored.find((x) => x && x.id === slot.id)
      return s
        ? { ...slot, name: s.name || slot.name, text: s.text || '' }
        : slot
    })
  } catch (e) {
    return base
  }
}

export function saveCustomPrompts(custom) {
  try {
    window.localStorage.setItem(LS_CUSTOM, JSON.stringify(custom))
  } catch (e) {
    // ignore (e.g. storage disabled) - in-memory state still works this session
  }
}

export function loadActiveId() {
  try {
    return window.localStorage.getItem(LS_ACTIVE) || DEFAULT_SYSTEM_PROMPT.id
  } catch (e) {
    return DEFAULT_SYSTEM_PROMPT.id
  }
}

export function saveActiveId(id) {
  try {
    window.localStorage.setItem(LS_ACTIVE, id)
  } catch (e) {
    // ignore
  }
}

export function allPrompts(custom) {
  return [DEFAULT_SYSTEM_PROMPT, ...custom]
}

export function getPromptById(custom, id) {
  return allPrompts(custom).find((p) => p.id === id) || DEFAULT_SYSTEM_PROMPT
}
