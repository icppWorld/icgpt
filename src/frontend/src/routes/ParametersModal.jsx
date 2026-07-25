// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { RECOMMENDED_PARAMS } from '../common/params'

// The inference-parameters panel for the Prompt Studio. Edits are LIVE: they write
// straight to the global `params` (persisted), and each generation reads the current
// values — no New chat needed (sampling is per-call; the thinking toggle only changes
// the next turn's assistant opener). Tiered: Tier 1 always visible, Sampling + Advanced
// collapsible. "Reset to recommended" restores the defaults.
//
// NOTE: the slider/number rows are inline render FUNCTIONS (called as {slider(...)}),
// not <Component/> tags — defining components inside render would remount the inputs on
// every keystroke and drop focus.
export function ParametersModal({ params, setParams, selectedModel, onClose }) {
  const supportsThinking = !!selectedModel?.inference?.supportsThinking

  const [showSampling, setShowSampling] = React.useState(false)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  // Local text buffer for the stop-sequence editor so newlines survive typing.
  const [stopText, setStopText] = React.useState(
    (params.stopSequences || []).join('\n')
  )

  const set = (key, value) => setParams({ ...params, [key]: value })
  const randSeed = () => Math.floor(Math.random() * 2 ** 31)

  function onStopChange(text) {
    setStopText(text)
    set(
      'stopSequences',
      text.split('\n').filter((s) => s.trim().length > 0)
    )
  }

  function resetAll() {
    setParams({ ...RECOMMENDED_PARAMS, stopSequences: [] })
    setStopText('')
  }

  // ---- styles (mirror SystemPromptModal) ---------------------------------
  const overlay = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
  }
  const card = {
    width: 'min(560px, 94vw)',
    maxHeight: '88vh',
    overflowY: 'auto',
    backgroundColor: '#21222c',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    padding: '18px 20px',
    textAlign: 'left',
    fontFamily: 'monospace',
  }
  const label = { fontSize: '13px', color: '#f8f8f2' }
  const help = { fontSize: '11px', color: '#6272a4', marginTop: '2px' }
  const valStyle = {
    fontSize: '12px',
    color: '#8be9fd',
    minWidth: '42px',
    textAlign: 'right',
  }
  const numInput = {
    width: '84px',
    backgroundColor: '#282a36',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '6px',
    padding: '4px 7px',
    fontFamily: 'monospace',
    fontSize: '13px',
  }
  const sectionHdr = (open) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    margin: '16px 0 8px',
    paddingTop: '10px',
    borderTop: '1px solid #44475a',
    fontSize: '13px',
    fontWeight: 'bold',
    color: open ? '#f8f8f2' : '#c7cbe0',
    userSelect: 'none',
  })
  const btn = (bg, fg) => ({
    backgroundColor: bg,
    color: fg,
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
  })
  const chip = (active) => ({
    ...btn(active ? '#bd93f9' : '#282a36', active ? '#21222c' : '#f8f8f2'),
    border: active ? 'none' : '1px solid #44475a',
    fontSize: '12px',
    padding: '4px 10px',
  })
  const row = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '12px 0',
  }

  // Inline render functions (NOT components — see the note above).
  const slider = ({ id, name, hint, min, max, step }) => (
    <div key={id} style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ ...label, flex: 1 }} htmlFor={id}>
          {name}
        </label>
        <span style={valStyle}>{params[id]}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={params[id]}
        onChange={(e) => set(id, Number(e.target.value))}
        style={{ width: '100%', accentColor: '#bd93f9' }}
      />
      {hint ? <div style={help}>{hint}</div> : null}
    </div>
  )

  const numberRow = ({ id, name, hint, min, max, step }) => (
    <div key={id} style={row}>
      <div style={{ flex: 1 }}>
        <label style={label} htmlFor={id}>
          {name}
        </label>
        {hint ? <div style={help}>{hint}</div> : null}
      </div>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={params[id]}
        onChange={(e) => set(id, Number(e.target.value))}
        style={numInput}
      />
    </div>
  )

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Parameters</div>
        <div style={{ ...help, marginTop: '4px' }}>
          Tune how the model samples. Changes apply to your next generation.
        </div>

        {/* Tier 1 — always visible */}
        {slider({
          id: 'temp',
          name: 'Temperature',
          hint: 'Creativity vs. obedience. 0.4–0.6 is more reliable for instructions.',
          min: 0,
          max: 2,
          step: 0.05,
        })}
        {numberRow({
          id: 'maxTokens',
          name: 'Max response length',
          hint: 'Total token cap for the reply (larger = more on-chain calls).',
          min: 32,
          max: 2048,
          step: 16,
        })}

        {/* Thinking toggle (Qwen3 hybrid model only) */}
        <div style={row}>
          <div style={{ flex: 1 }}>
            <label style={label}>Thinking mode</label>
            <div style={help}>
              {supportsThinking
                ? 'Let the model reason first (slower, more tokens).'
                : `Not available for ${
                    selectedModel?.gguf || 'this model'
                  } — it is not a thinking model.`}
            </div>
          </div>
          <button
            type="button"
            disabled={!supportsThinking}
            onClick={() => set('thinking', !params.thinking)}
            style={{
              ...chip(supportsThinking && params.thinking),
              opacity: supportsThinking ? 1 : 0.5,
              cursor: supportsThinking ? 'pointer' : 'not-allowed',
            }}
          >
            {supportsThinking && params.thinking ? 'On' : 'Off'}
          </button>
        </div>

        {/* Seed */}
        <div style={row}>
          <div style={{ flex: 1 }}>
            <label style={label}>Seed</label>
            <div style={help}>
              Lock a seed to repeat a run across prompt edits; randomize for
              variety.
            </div>
          </div>
          {params.seed === null || params.seed === undefined ? (
            <button
              type="button"
              style={chip(false)}
              onClick={() => set('seed', randSeed())}
            >
              🎲 Random — lock
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                value={params.seed}
                onChange={(e) => set('seed', Number(e.target.value))}
                style={numInput}
              />
              <button
                type="button"
                title="Reroll"
                style={chip(false)}
                onClick={() => set('seed', randSeed())}
              >
                🎲
              </button>
              <button
                type="button"
                title="Back to random"
                style={chip(false)}
                onClick={() => set('seed', null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Tier 2 — Sampling */}
        <div
          style={sectionHdr(showSampling)}
          onClick={() => setShowSampling((v) => !v)}
        >
          <span>{showSampling ? '▾' : '▸'}</span> Sampling
        </div>
        {showSampling ? (
          <div>
            {slider({ id: 'minP', name: 'min_p', min: 0, max: 1, step: 0.01 })}
            {slider({ id: 'topP', name: 'top_p', min: 0, max: 1, step: 0.01 })}
            {numberRow({
              id: 'topK',
              name: 'top_k (0 = off)',
              min: 0,
              max: 100,
              step: 1,
            })}
            {slider({
              id: 'repeatPenalty',
              name: 'repeat_penalty',
              min: 1,
              max: 1.5,
              step: 0.05,
            })}
            {numberRow({
              id: 'repeatLastN',
              name: 'repeat_last_n',
              min: 0,
              max: 256,
              step: 1,
            })}
            <div style={{ margin: '12px 0' }}>
              <label style={label} htmlFor="stopSeq">
                Stop sequences
              </label>
              <div style={help}>
                One per line. Generation halts when the output hits one.
              </div>
              <textarea
                id="stopSeq"
                value={stopText}
                onChange={(e) => onStopChange(e.target.value)}
                rows={3}
                placeholder={'e.g.\n###\nUser:'}
                style={{
                  ...numInput,
                  width: '100%',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  marginTop: '4px',
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Tier 3 — Advanced */}
        <div
          style={sectionHdr(showAdvanced)}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <span>{showAdvanced ? '▾' : '▸'}</span> Advanced
        </div>
        {showAdvanced ? (
          <div>
            {slider({
              id: 'presencePenalty',
              name: 'presence_penalty',
              min: -2,
              max: 2,
              step: 0.1,
            })}
            {slider({
              id: 'frequencyPenalty',
              name: 'frequency_penalty',
              min: -2,
              max: 2,
              step: 0.1,
            })}
          </div>
        ) : null}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            marginTop: '18px',
            paddingTop: '12px',
            borderTop: '1px solid #44475a',
          }}
        >
          <button
            type="button"
            style={btn('#282a36', '#f8f8f2')}
            onClick={resetAll}
          >
            Reset to recommended
          </button>
          <button
            type="button"
            style={btn('#bd93f9', '#21222c')}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

ParametersModal.propTypes = {
  params: PropTypes.object.isRequired,
  setParams: PropTypes.func.isRequired,
  selectedModel: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
}
