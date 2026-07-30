// Prompt templates for the Prompt Cost Lab. A template is a reusable "scenario":
// a system + user prompt with {{variable}} slots, a set of variable declarations
// (each either SWEPT across trials or held CONSTANT), and quality rules. Users pick
// the built-in example or edit/save up to NUM_CUSTOM_SLOTS custom templates. The
// active selection + the custom slots persist per-browser in localStorage.
//
// This mirrors common/systemPrompts.js (slots + merge-onto-defaults loader), with a
// richer slot shape. The templates carry only the PROMPT design — the model + sampling
// params are chosen in the Lab UI (see PromptCostLab.jsx). Rendering + the cache-break
// analysis live in common/templateEngine.js; the raw system/user text is still wrapped
// in the model's chat template (TEMPLATES in canisters/llamacpp.js) at run time.
//
// Slot shape:
//   { id, name, builtin?,
//     systemTemplate : string,          // may contain {{var}}
//     userTemplate   : string,          // may contain {{var}}
//     vars    : [ { name, kind: 'sweep'|'constant', values: string[], value: string } ],
//     quality : [ { type: 'notContains'|'contains'|'regex'|'manual', arg: string } ] }
// A `{{var}}` in `arg` (e.g. "{{word}}") is substituted per-binding before the rule runs.

// The dominant cost lever is WHERE the first swept variable appears in the
// concatenated prompt: everything after it is re-ingested every trial. This built-in
// puts {{word}} in the USER turn (late, near generation) — the cost-optimal placement —
// so it makes a good starting point to experiment against.
export const DEFAULT_TEMPLATE = {
  id: 'default',
  name: 'Word-guessing game (example)',
  builtin: true,
  systemTemplate:
    'You are the host of a word-guessing game. The player must guess a secret ' +
    'word from your hints. Give exactly ONE short hint (a single sentence) that ' +
    'describes the thing, WITHOUT ever writing the word itself or any part of it.',
  userTemplate: 'Give a one-sentence hint for the secret word: {{word}}',
  vars: [
    {
      name: 'word',
      kind: 'sweep',
      values: ['HOUSE', 'TREE', 'CAR', 'OCEAN', 'GUITAR'],
      value: '',
    },
  ],
  quality: [{ type: 'notContains', arg: '{{word}}' }],
}

export const NUM_CUSTOM_SLOTS = 3

const LS_CUSTOM = 'icgpt.templates.custom'
const LS_ACTIVE = 'icgpt.templates.activeId'

function emptySlot(i) {
  return {
    id: `custom-${i + 1}`,
    name: `Custom ${i + 1}`,
    systemTemplate: '',
    userTemplate: '',
    vars: [],
    quality: [],
  }
}

function defaultCustomTemplates() {
  return Array.from({ length: NUM_CUSTOM_SLOTS }, (_, i) => emptySlot(i))
}

// Coerce one stored slot onto a fresh slot, tolerating shape drift (missing keys,
// wrong types) so an old localStorage payload can never crash the Lab.
function mergeSlot(base, stored) {
  if (!stored) return base
  return {
    ...base,
    name:
      typeof stored.name === 'string' && stored.name ? stored.name : base.name,
    systemTemplate:
      typeof stored.systemTemplate === 'string' ? stored.systemTemplate : '',
    userTemplate:
      typeof stored.userTemplate === 'string' ? stored.userTemplate : '',
    vars: Array.isArray(stored.vars) ? stored.vars.map(normalizeVar) : [],
    quality: Array.isArray(stored.quality)
      ? stored.quality.filter((r) => r && typeof r.type === 'string')
      : [],
  }
}

function normalizeVar(v) {
  return {
    name: typeof v?.name === 'string' ? v.name : '',
    kind: v?.kind === 'constant' ? 'constant' : 'sweep',
    values: Array.isArray(v?.values) ? v.values.map(String) : [],
    value: typeof v?.value === 'string' ? v.value : '',
  }
}

// Merge whatever is stored onto a fresh set of slots, so a shape change (e.g. a
// bumped NUM_CUSTOM_SLOTS) can never produce missing/extra slots.
export function loadCustomTemplates() {
  const base = defaultCustomTemplates()
  try {
    const raw = window.localStorage.getItem(LS_CUSTOM)
    if (!raw) return base
    const stored = JSON.parse(raw)
    if (!Array.isArray(stored)) return base
    return base.map((slot) =>
      mergeSlot(
        slot,
        stored.find((x) => x && x.id === slot.id)
      )
    )
  } catch (e) {
    return base
  }
}

export function saveCustomTemplates(custom) {
  try {
    window.localStorage.setItem(LS_CUSTOM, JSON.stringify(custom))
  } catch (e) {
    // ignore (e.g. storage disabled) - in-memory state still works this session
  }
}

export function loadActiveId() {
  try {
    return window.localStorage.getItem(LS_ACTIVE) || DEFAULT_TEMPLATE.id
  } catch (e) {
    return DEFAULT_TEMPLATE.id
  }
}

export function saveActiveId(id) {
  try {
    window.localStorage.setItem(LS_ACTIVE, id)
  } catch (e) {
    // ignore
  }
}

export function allTemplates(custom) {
  return [DEFAULT_TEMPLATE, ...custom]
}

export function getTemplateById(custom, id) {
  return allTemplates(custom).find((t) => t.id === id) || DEFAULT_TEMPLATE
}
