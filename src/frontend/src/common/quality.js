// Quality signals for the Prompt Cost Lab. A template carries a list of quality
// rules; after each trial's reply we evaluate them to a pass/fail (or leave it
// pending for a Manual rule the user rates by eye). `arg` may contain {{var}}, which
// is substituted with the trial's binding first (e.g. "reply must NOT contain
// {{word}}" is the word-game leak detector).
//
// The `judge` rule type is resolved ASYNCHRONOUSLY (an on-chain LLM scores the reply
// against a rubric; see labEngine's judge pass), so evalRules leaves it deferred and
// the caller folds the judge verdict in with combineVerdicts.
import { renderTemplate } from './templateEngine'

export const DEFAULT_JUDGE_THRESHOLD = 60

export const RULE_TYPES = [
  { type: 'notContains', label: 'Reply must NOT contain', needsArg: true },
  { type: 'contains', label: 'Reply must contain', needsArg: true },
  { type: 'regex', label: 'Reply must match regex (i)', needsArg: true },
  {
    type: 'judge',
    label: 'LLM judge — rubric score ≥ threshold',
    needsArg: true,
    needsThreshold: true,
  },
  { type: 'manual', label: 'Manual — I rate pass/fail', needsArg: false },
]

// The judge rules on a template (resolved via the on-chain LLM, not synchronously).
export function judgeRules(rules) {
  return (rules || []).filter((r) => r.type === 'judge')
}

// Fold tri-state verdicts (true | false | null) into one: any fail => fail; else any
// pending => pending; else pass. Empty => null.
export function combineVerdicts(verdicts) {
  const vs = (verdicts || []).filter((v) => v !== undefined)
  if (!vs.length) return null
  if (vs.some((v) => v === false)) return false
  if (vs.some((v) => v === null)) return null
  return true
}

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
    case 'judge':
      // Resolved asynchronously by the on-chain LLM; excluded from the sync verdict.
      return {
        pass: null,
        detail: `llm judge ≥ ${rule.threshold ?? DEFAULT_JUDGE_THRESHOLD}`,
        deferred: true,
      }
    case 'manual':
      return { pass: null, detail: 'manual rating' }
    default:
      return { pass: null, detail: 'unknown rule' }
  }
}

// Overall SYNC verdict for a reply: fail if ANY programmatic rule fails; pending (null)
// if a Manual rule is unresolved; pass if all resolved rules pass. Judge rules are
// deferred (resolved async in labEngine, then folded in via combineVerdicts). No
// synchronously-resolvable rules => null.
export function evalRules(rules, reply, binding) {
  const results = (rules || []).map((r) => ({
    rule: r,
    ...evalRule(r, reply, binding),
  }))
  const sync = results.filter((r) => !r.deferred)
  if (!sync.length) return { pass: null, results }
  if (sync.some((r) => r.pass === false)) return { pass: false, results }
  if (sync.some((r) => r.pass === null)) return { pass: null, results }
  return { pass: true, results }
}
