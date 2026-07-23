// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { MODELS, getModelById } from './models'

// A slim bar pinned to the top of the chat page: the two experiment knobs of
// the test bed side by side - the model dropdown (option text = full gguf
// filename, with a HuggingFace ↗ link) and the active system prompt (a button
// showing its name that opens the editor modal).
//
// Only one model is live now (Qwen2.5); Qwen3-0.6B is a disabled "coming soon"
// placeholder. Built data-driven from MODELS so adding a model is just a new entry.
export function ModelSelector({
  selectedModelId,
  setSelectedModelId,
  activeSystemPromptName,
  onOpenSystemPrompt,
}) {
  const selected = getModelById(selectedModelId)

  const barStyle = {
    position: 'fixed',
    top: '6px',
    left: 0,
    right: 0,
    zIndex: 950, // above the conversation view (900)
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'none', // only the controls below are interactive
  }

  const selectStyle = {
    pointerEvents: 'auto',
    backgroundColor: '#21222c',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '6px',
    padding: '4px 8px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
    maxWidth: '80vw',
  }

  const linkStyle = {
    pointerEvents: 'auto',
    color: '#bd93f9',
    fontSize: '15px',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
  }

  const dividerStyle = {
    width: '1px',
    height: '18px',
    backgroundColor: '#44475a',
    margin: '0 2px',
  }

  const promptButtonStyle = {
    pointerEvents: 'auto',
    backgroundColor: '#21222c',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '6px',
    padding: '4px 8px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
    maxWidth: '40vw',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  return (
    <div style={barStyle}>
      <select
        aria-label="Select model"
        value={selectedModelId}
        onChange={(e) => setSelectedModelId(e.target.value)}
        style={selectStyle}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id} disabled={!m.available}>
            {m.available ? m.gguf : `${m.gguf} (coming soon)`}
          </option>
        ))}
      </select>
      <a
        href={selected.hfUrl}
        target="_blank"
        rel="noreferrer"
        title={`View ${selected.gguf} on HuggingFace`}
        style={linkStyle}
      >
        {/* https://icons.getbootstrap.com/ */}
        <i className="bi bi-box-arrow-up-right"></i>
      </a>
      <span style={dividerStyle} />
      <button
        type="button"
        aria-label="Edit system prompt"
        title="View / edit the system prompt"
        onClick={onOpenSystemPrompt}
        style={promptButtonStyle}
      >
        <i className="bi bi-gear" style={{ marginRight: '5px' }}></i>
        System: {activeSystemPromptName}
      </button>
    </div>
  )
}

ModelSelector.propTypes = {
  selectedModelId: PropTypes.string.isRequired,
  setSelectedModelId: PropTypes.func.isRequired,
  activeSystemPromptName: PropTypes.string.isRequired,
  onOpenSystemPrompt: PropTypes.func.isRequired,
}
