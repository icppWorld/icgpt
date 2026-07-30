// Quality signals for the Prompt Cost Lab. A template carries a list of quality
// rules; after each trial's reply we evaluate them to a pass/fail (or leave it
// pending for a Manual rule the user rates by eye). `arg` may contain {{var}}, which
// is substituted with the trial's binding first (e.g. "reply must NOT contain
// {{word}}" is the word-game leak detector). An LLM-judge rule type is added in
// Phase C.
import { renderTemplate } from './templateEngine'

export const RULE_TYPES = [
  { type: 'notContains', label: 'Reply must NOT contain', needsArg: true },
  { type: 'contains', label: 'Reply must contain', needsArg: true },
  { type: 'regex', label: 'Reply must match regex (i)', needsArg: true },
  { type: 'manual', label: 'Manual — I rate pass/fail', needsArg: false },
]

function containsCI(haystack, needle) {
  if (!needle) return false
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

// Evaluate ONE rule against a reply. Returns { pass: true|false|null, detail } where
// null means "undetermined" (a Manual rule, or an invalid regex).
export function evalRule(rule, reply, binding) {
  const arg = renderTemplate(rule.arg || '', binding)
  const text = reply || ''
  switch (rule.type) {
    case 'notContains':
      return {
        pass: !containsCI(text, arg),
        detail: `must not contain "${arg}"`,
      }
    case 'contains':
      return { pass: containsCI(text, arg), detail: `must contain "${arg}"` }
    case 'regex': {
      let re
      try {
        re = new RegExp(arg, 'i')
      } catch (e) {
        return { pass: null, detail: `invalid regex /${arg}/` }
      }
      return { pass: re.test(text), detail: `must match /${arg}/i` }
    }
    case 'manual':
      return { pass: null, detail: 'manual rating' }
    default:
      return { pass: null, detail: 'unknown rule' }
  }
}

// Overall verdict for a reply: fail if ANY programmatic rule fails; pending (null) if
// a Manual rule is unresolved; pass if all resolved rules pass. No rules => null.
export function evalRules(rules, reply, binding) {
  const results = (rules || []).map((r) => ({
    rule: r,
    ...evalRule(r, reply, binding),
  }))
  if (!results.length) return { pass: null, results }
  if (results.some((r) => r.pass === false)) return { pass: false, results }
  if (results.some((r) => r.pass === null)) return { pass: null, results }
  return { pass: true, results }
}
