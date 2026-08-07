// eslint-disable-next-line no-use-before-define
import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { MODELS, getModelById, DEFAULT_MODEL_ID } from '../common/models'
import { RECOMMENDED_PARAMS } from '../common/params'
import {
  loadCustomTemplates,
  saveCustomTemplates,
  loadActiveId,
  saveActiveId,
  allTemplates,
  getTemplateById,
} from '../common/templates'
import { lintTemplate, placementEstimate } from '../common/templateEngine'
import { RULE_TYPES, DEFAULT_JUDGE_THRESHOLD } from '../common/quality'
import { LabReport, RunCompareTable } from './LabReport'

// The Prompt Cost Lab: author templated prompts, sweep variable bindings, and read the
// exact on-chain cost (one-time warm-up + steady-state per request) alongside a quality
// pass-rate. A power tool for AI-task designers; gated to early-access users by living
// under <App> (no extra gate needed — see Main.jsx). See the plan + docs for the model.

const S = {
  page: {
    maxWidth: '980px',
    margin: '0 auto',
    padding: '18px 20px 80px',
    color: '#f8f8f2',
  },
  h1: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#f1fa8c',
    margin: '0 0 2px',
  },
  lead: { color: '#6272a4', fontSize: '13px', margin: '0 0 18px' },
  section: {
    background: '#21222c',
    border: '1px solid #44475a',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#6272a4',
    margin: '0 0 4px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#1a1b23',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '6px',
    padding: '7px 9px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  mono: { fontFamily: "'SF Mono', ui-monospace, Menlo, monospace" },
  btn: {
    background: '#bd93f9',
    color: '#21222c',
    border: 'none',
    borderRadius: '8px',
    padding: '9px 18px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
  },
  btnGhost: {
    background: '#21222c',
    color: '#8be9fd',
    border: '1px solid #44475a',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  row: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
}

function cloneTemplate(t) {
  return {
    name: t.name,
    systemTemplate: t.systemTemplate || '',
    userTemplate: t.userTemplate || '',
    vars: (t.vars || []).map((v) => ({ ...v, values: [...(v.values || [])] })),
    quality: (t.quality || []).map((r) => ({ ...r })),
  }
}

export function PromptCostLab() {
  // The experiment run (running/progress/report/runs/error + start/cancel) lives in
  // <App> so it survives navigating away from the Lab; see App.jsx `labRun`. This
  // component owns only the editor/workbench state below.
  const { labRun } = useOutletContext()
  // Editor setup is hydrated from the on-chain snapshot (labRun.editor, loaded by <App>
  // before this mounts) when present, else from today's per-browser defaults. The saved
  // snapshot carries the selected model, samples/trial, and the in-progress template.
  const savedEditor = labRun.editor
  const [custom, setCustom] = React.useState(loadCustomTemplates)
  const [draft, setDraft] = React.useState(() =>
    cloneTemplate(
      savedEditor && savedEditor.draft
        ? savedEditor.draft
        : getTemplateById(loadCustomTemplates(), loadActiveId())
    )
  )
  const [pickId, setPickId] = React.useState(loadActiveId)
  const [modelId, setModelId] = React.useState(
    savedEditor && savedEditor.modelId ? savedEditor.modelId : DEFAULT_MODEL_ID
  )
  const [params, setParams] = React.useState(() => ({ ...RECOMMENDED_PARAMS }))
  const [kSamples, setKSamples] = React.useState(
    savedEditor && savedEditor.kSamples ? savedEditor.kSamples : 1
  )

  // Report editor edits up to <App>, which stores them in a ref and debounces the
  // on-chain save. Skip the initial mount fire: the state above was just hydrated from
  // labRun.editor, so there is nothing new to persist yet.
  const editorReported = React.useRef(false)
  React.useEffect(() => {
    if (!editorReported.current) {
      editorReported.current = true
      return
    }
    labRun.onEditorChange({ modelId, kSamples, draft })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, modelId, kSamples])

  const model = getModelById(modelId)
  const warnings = lintTemplate(draft)
  const placement = placementEstimate(draft, model, params)

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const setParam = (k, v) => setParams((p) => ({ ...p, [k]: v }))

  function loadIntoDraft(id) {
    setPickId(id)
    setDraft(cloneTemplate(getTemplateById(custom, id)))
    saveActiveId(id)
  }
  function saveToSlot(slotId) {
    const next = custom.map((s) =>
      s.id === slotId
        ? { ...cloneTemplate(draft), id: slotId, name: draft.name || s.name }
        : s
    )
    setCustom(next)
    saveCustomTemplates(next)
  }

  // ----- variable rows -----
  const setVar = (i, patch) =>
    setDraft((d) => ({
      ...d,
      vars: d.vars.map((v, j) => (j === i ? { ...v, ...patch } : v)),
    }))
  const addVar = () =>
    setDraft((d) => ({
      ...d,
      vars: [...d.vars, { name: '', kind: 'sweep', values: [], value: '' }],
    }))
  const delVar = (i) =>
    setDraft((d) => ({ ...d, vars: d.vars.filter((_, j) => j !== i) }))

  // ----- quality rows -----
  const setRule = (i, patch) =>
    setDraft((d) => ({
      ...d,
      quality: d.quality.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }))
  const addRule = () =>
    setDraft((d) => ({
      ...d,
      quality: [...d.quality, { type: 'notContains', arg: '' }],
    }))
  const delRule = (i) =>
    setDraft((d) => ({ ...d, quality: d.quality.filter((_, j) => j !== i) }))

  return (
    <div style={S.page}>
      <Helmet>
        <title>Prompt Cost Lab — ICGPT</title>
      </Helmet>
      <div>
        <h1 style={S.h1}>Prompt Cost Lab</h1>
        <p style={S.lead}>
          Design a repeating on-chain AI task, sweep its variables, and see the
          exact cost per request — and the quality — so you can optimize it.
        </p>
      </div>

      {/* Template picker + save */}
      <div style={S.section}>
        <div style={S.row}>
          <div>
            <label style={S.label}>Load template</label>
            <select
              value={pickId}
              onChange={(e) => loadIntoDraft(e.target.value)}
              style={{ ...S.input, width: 'auto' }}
            >
              {allTemplates(custom).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={S.label}>Name</label>
            <input
              style={S.input}
              value={draft.name}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>
          <div>
            <label style={S.label}>Save to</label>
            <div style={S.row}>
              {custom.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  style={S.btnGhost}
                  onClick={() => saveToSlot(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div style={S.section}>
        <label style={S.label}>
          System template — the fixed instructions (cached prefix; keep swept{' '}
          <code>{'{{vars}}'}</code> OUT of here)
        </label>
        <textarea
          style={{ ...S.input, ...S.mono, minHeight: '90px' }}
          value={draft.systemTemplate}
          onChange={(e) => setField('systemTemplate', e.target.value)}
        />
        <label style={{ ...S.label, marginTop: '12px' }}>
          User template — the per-request prompt (put swept{' '}
          <code>{'{{vars}}'}</code> here, as late as possible)
        </label>
        <textarea
          style={{ ...S.input, ...S.mono, minHeight: '60px' }}
          value={draft.userTemplate}
          onChange={(e) => setField('userTemplate', e.target.value)}
        />
      </div>

      {/* Variables */}
      <div style={S.section}>
        <div style={{ ...S.row, justifyContent: 'space-between' }}>
          <strong>Variables</strong>
          <button type="button" style={S.btnGhost} onClick={addVar}>
            + variable
          </button>
        </div>
        {draft.vars.length === 0 ? (
          <div style={{ color: '#6272a4', fontSize: '13px', marginTop: '8px' }}>
            No variables. Add one and reference it as <code>{'{{name}}'}</code>{' '}
            in a template.
          </div>
        ) : null}
        {draft.vars.map((v, i) => (
          <div
            key={i}
            style={{
              ...S.row,
              alignItems: 'flex-start',
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: i ? '1px solid #333' : 'none',
            }}
          >
            <div style={{ width: '140px' }}>
              <label style={S.label}>name</label>
              <input
                style={{ ...S.input, ...S.mono }}
                value={v.name}
                placeholder="word"
                onChange={(e) => setVar(i, { name: e.target.value })}
              />
            </div>
            <div style={{ width: '150px' }}>
              <label style={S.label}>kind</label>
              <select
                style={S.input}
                value={v.kind}
                onChange={(e) => setVar(i, { kind: e.target.value })}
              >
                <option value="sweep">sweep (per-trial)</option>
                <option value="constant">constant</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              {v.kind === 'sweep' ? (
                <>
                  <label style={S.label}>values (one per line)</label>
                  <textarea
                    style={{ ...S.input, ...S.mono, minHeight: '54px' }}
                    value={(v.values || []).join('\n')}
                    onChange={(e) =>
                      setVar(i, {
                        values: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </>
              ) : (
                <>
                  <label style={S.label}>value</label>
                  <input
                    style={{ ...S.input, ...S.mono }}
                    value={v.value || ''}
                    onChange={(e) => setVar(i, { value: e.target.value })}
                  />
                </>
              )}
            </div>
            <button
              type="button"
              style={{ ...S.btnGhost, marginTop: '18px' }}
              onClick={() => delVar(i)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Quality rules */}
      <div style={S.section}>
        <div style={{ ...S.row, justifyContent: 'space-between' }}>
          <strong>Quality rules</strong>
          <button type="button" style={S.btnGhost} onClick={addRule}>
            + rule
          </button>
        </div>
        {draft.quality.map((r, i) => {
          const def = RULE_TYPES.find((t) => t.type === r.type)
          return (
            <div key={i} style={{ ...S.row, marginTop: '10px' }}>
              <select
                style={{ ...S.input, width: 'auto' }}
                value={r.type}
                onChange={(e) => setRule(i, { type: e.target.value })}
              >
                {RULE_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
              {def && def.needsArg ? (
                <input
                  style={{ ...S.input, ...S.mono, flex: 1, minWidth: '160px' }}
                  value={r.arg || ''}
                  placeholder={
                    r.type === 'judge'
                      ? 'rubric, e.g. a good one-sentence hint about {{word}} that never says the word'
                      : 'e.g. {{word}}'
                  }
                  onChange={(e) => setRule(i, { arg: e.target.value })}
                />
              ) : null}
              {def && def.needsThreshold ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  style={{ ...S.input, width: '68px' }}
                  value={r.threshold ?? DEFAULT_JUDGE_THRESHOLD}
                  title="Pass threshold (score ≥ this passes)"
                  onChange={(e) =>
                    setRule(i, { threshold: Number(e.target.value) })
                  }
                />
              ) : null}
              <button
                type="button"
                style={S.btnGhost}
                onClick={() => delRule(i)}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {/* Model + run params */}
      <div style={S.section}>
        <div style={{ ...S.row, alignItems: 'flex-end' }}>
          <div>
            <label style={S.label}>Model</label>
            <select
              style={{ ...S.input, width: 'auto' }}
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            >
              {MODELS.filter((m) => m.available).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.gguf}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: '90px' }}>
            <label style={S.label}>temp</label>
            <input
              type="number"
              step="0.1"
              style={S.input}
              value={params.temp}
              onChange={(e) => setParam('temp', Number(e.target.value))}
            />
          </div>
          <div style={{ width: '110px' }}>
            <label style={S.label}>max tokens</label>
            <input
              type="number"
              style={S.input}
              value={params.maxTokens}
              onChange={(e) => setParam('maxTokens', Number(e.target.value))}
            />
          </div>
          {model.inference.supportsThinking ? (
            <label style={{ ...S.label, marginBottom: '9px' }}>
              <input
                type="checkbox"
                checked={!!params.thinking}
                onChange={(e) => setParam('thinking', e.target.checked)}
              />{' '}
              thinking
            </label>
          ) : null}
          <div style={{ width: '110px' }}>
            <label style={S.label}>samples / trial</label>
            <input
              type="number"
              min="1"
              style={S.input}
              value={kSamples}
              onChange={(e) => setKSamples(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Analyzer */}
      {warnings.length || placement ? (
        <div style={{ ...S.section, borderLeft: '3px solid #ffb86c' }}>
          <strong>Analyzer (estimated)</strong>
          {placement ? (
            <div style={{ fontSize: '13px', marginTop: '8px' }}>
              Cache reused through ~<b>{placement.estCachedTokens}</b> tokens;
              re-ingested ~<b>{placement.estReingestTokens}</b> tokens/trial (
              {placement.pctReingested}% of the prompt) + generation. The
              re-ingested suffix is the recurring ingestion cost — shrink it by
              moving swept variables later.
            </div>
          ) : (
            <div
              style={{ fontSize: '13px', marginTop: '8px', color: '#6272a4' }}
            >
              No swept variable to analyze yet.
            </div>
          )}
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: '13px',
                marginTop: '8px',
                color:
                  w.level === 'error'
                    ? '#ff5555'
                    : w.level === 'warn'
                    ? '#ffb86c'
                    : '#6272a4',
              }}
            >
              {w.msg}
            </div>
          ))}
        </div>
      ) : null}

      {/* Run */}
      <div style={{ ...S.row, marginTop: '4px', marginBottom: '18px' }}>
        {labRun.running ? (
          <button
            type="button"
            style={{ ...S.btn, background: '#ff5555' }}
            onClick={() => {
              labRun.cancel()
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            style={S.btn}
            onClick={() =>
              labRun.start({
                template: draft,
                model,
                params,
                kSamples: Number(kSamples) || 1,
              })
            }
          >
            ▶ Run experiment
          </button>
        )}
        {labRun.progress ? (
          <span style={{ color: '#6272a4', fontSize: '13px' }}>
            {labRun.progress.label}
            {labRun.progress.total
              ? ` — ${labRun.progress.done}/${labRun.progress.total}`
              : ''}
          </span>
        ) : null}
      </div>

      {labRun.error ? (
        <div
          style={{
            ...S.section,
            borderLeft: '3px solid #ff5555',
            color: '#ff8888',
          }}
        >
          {labRun.error}
        </div>
      ) : null}

      {labRun.report ? (
        <div style={S.section}>
          <LabReport report={labRun.report} />
        </div>
      ) : null}

      <RunCompareTable runs={labRun.runs} onClear={labRun.clearRuns} />
    </div>
  )
}
