// Pure helpers for the Prompt Cost Lab: {{variable}} rendering, binding-set
// expansion, and the cache-break ANALYZER.
//
// Cost model (see the docs' worked example): llama.cpp's prompt cache is a
// boundary-agnostic prefix match — everything from the first token that differs
// between two trials is re-ingested every trial. So the recurring cost is driven by
// WHERE the earliest SWEPT variable appears in the concatenated, chat-template-wrapped
// prompt. This module estimates that break point at the CHARACTER level (the UI can't
// know the canister's true token boundaries; Phase B swaps in exact token offsets).
import { estimateTokens, buildInstructTurnPrompt } from '../canisters/llamacpp'

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

// Unique variable names referenced as {{name}} in a string.
export function extractVars(str) {
  const out = []
  const seen = new Set()
  let m
  VAR_RE.lastIndex = 0
  while ((m = VAR_RE.exec(str || '')) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      out.push(m[1])
    }
  }
  return out
}

// Substitute {{name}} with bindings[name] (missing → empty string).
export function renderTemplate(str, bindings) {
  return (str || '').replace(VAR_RE, (_, name) =>
    bindings && bindings[name] != null ? String(bindings[name]) : ''
  )
}

export function sweepVars(vars) {
  return (vars || []).filter((v) => v && v.kind === 'sweep' && v.name)
}
export function constantVars(vars) {
  return (vars || []).filter((v) => v && v.kind === 'constant' && v.name)
}

// The list of concrete binding maps for a sweep = cartesian product of every swept
// variable's value list, with constants merged into each. One template + these bindings
// = the experiment.
export function bindingSets(vars) {
  const consts = {}
  constantVars(vars).forEach((v) => {
    consts[v.name] = v.value
  })
  const sweeps = sweepVars(vars).filter((v) => (v.values || []).length > 0)
  let sets = [{ ...consts }]
  for (const v of sweeps) {
    const next = []
    for (const s of sets) {
      for (const val of v.values) next.push({ ...s, [v.name]: val })
    }
    sets = next
  }
  return sets
}

// Textual lint: catches the expensive antipattern (a swept variable in the SYSTEM
// prompt = the cached region) plus used-but-undeclared / declared-but-unused vars.
export function lintTemplate(tpl) {
  const usedSys = new Set(extractVars(tpl.systemTemplate))
  const usedUser = new Set(extractVars(tpl.userTemplate))
  const used = new Set([...usedSys, ...usedUser])
  const declared = new Set((tpl.vars || []).map((v) => v.name).filter(Boolean))
  const warnings = []
  for (const v of sweepVars(tpl.vars)) {
    if (usedSys.has(v.name)) {
      warnings.push({
        level: 'warn',
        variable: v.name,
        msg: `Swept variable {{${v.name}}} is used in the SYSTEM prompt (the cached region). Changing it re-ingests the rest of the system prompt AND the whole user prompt every trial. Prefer referencing it only in the user prompt, as late as possible.`,
      })
    }
  }
  for (const name of used) {
    if (!declared.has(name)) {
      warnings.push({
        level: 'error',
        variable: name,
        msg: `{{${name}}} is used but not declared. Add it as a sweep or constant variable.`,
      })
    }
  }
  for (const name of declared) {
    if (!used.has(name)) {
      warnings.push({
        level: 'info',
        variable: name,
        msg: `Variable "${name}" is declared but not used in either template.`,
      })
    }
  }
  return warnings
}

// Char index of the first difference between two strings (or their common length).
function firstDivergence(a, b) {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a[i] === b[i]) i += 1
  return i
}

// Estimate the cache-break: wrap the first binding and an "alt" binding (every swept
// var swapped to a guaranteed-different value) in the model's chat template, then find
// the first character where they diverge. Everything before = cached prefix (reused
// each trial); everything after = re-ingested suffix (the recurring ingestion cost).
// Returns null when nothing is swept (no recurring re-ingestion to analyze).
export function placementEstimate(tpl, model, params) {
  const sweeps = sweepVars(tpl.vars)
  if (!sweeps.length) return null
  const sets = bindingSets(tpl.vars)
  const b0 = sets[0] || {}
  const bAlt = { ...b0 }
  // Diverge each swept value at its FIRST char (prepend a sentinel space) so the cache-break
  // lands at the START of the variable, not after a shared value prefix ("HOUSE" vs
  // "HOUSEALT" would wrongly diverge AFTER "HOUSE"). Keeps the warm-up prefix ending right
  // BEFORE the variable, so every trial reuses the identical fixed prefix. bAlt only locates
  // the offset; it is never sent to a canister.
  for (const v of sweeps) bAlt[v.name] = ' ' + String(b0[v.name] || '')

  const wrap = (b) =>
    buildInstructTurnPrompt(
      '',
      renderTemplate(tpl.userTemplate, b),
      renderTemplate(tpl.systemTemplate, b),
      model,
      params
    )
  const w0 = wrap(b0)
  const wAlt = wrap(bAlt)
  const breakChar = firstDivergence(w0, wAlt)
  const reingestChars = Math.max(0, w0.length - breakChar)
  return {
    totalChars: w0.length,
    cacheBreakChar: breakChar,
    cachedChars: breakChar,
    reingestChars,
    // cached prefix (paid once) vs re-ingested suffix (paid every trial); excludes generation
    estCachedTokens: estimateTokens(w0.slice(0, breakChar)),
    estReingestTokens: estimateTokens(w0.slice(breakChar)),
    pctReingested: w0.length
      ? Math.round((reingestChars / w0.length) * 100)
      : 0,
  }
}
