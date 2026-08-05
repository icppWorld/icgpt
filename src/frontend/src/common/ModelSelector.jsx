// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { MODELS, getModelById } from './models'
import { useIsMobile } from './useIsMobile'

// A slim bar pinned to the top of the chat page: the two experiment knobs of
// the test bed side by side - the model dropdown (option text = full gguf
// filename, with a HuggingFace ↗ link) and the active system prompt (a button
// showing its name that opens the editor modal).
//
// Built data-driven from MODELS (see models.js) so adding a model is just a new
// entry. The selected model's `note` (a quality/use-case hint) shows as the
// dropdown's hover tooltip.
export function ModelSelector({
  selectedModelId,
  setSelectedModelId,
  activeSystemPromptName,
  onOpenSystemPrompt,
  onOpenParams,
}) {
  const selected = getModelById(selectedModelId)
  const isMobile = useIsMobile()

  // A centered toolbar row sitting just BELOW the shared TopNav (48px). On mobile the controls
  // wrap onto multiple rows instead of overflowing off the right edge.
  const barStyle = {
    position: 'fixed',
    top: '52px', // just below the shared TopNav (TOPNAV_HEIGHT = 48)
    left: 0,
    right: 0,
    zIndex: 950, // above the conversation view (900), below the TopNav (1000)
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    padding: isMobile ? '0 10px' : 0,
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
    maxWidth: isMobile ? '68vw' : '80vw',
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
        title={selected.note || `Select model — active: ${selected.gguf}`}
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
      {isMobile ? null : <span style={dividerStyle} />}
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
      <button
        type="button"
        aria-label="Edit inference parameters"
        title="Tune temperature, sampling, thinking mode, …"
        onClick={onOpenParams}
        style={{ ...promptButtonStyle, maxWidth: 'none' }}
      >
        <i className="bi bi-sliders" style={{ marginRight: '5px' }}></i>
        Params
      </button>
    </div>
  )
}

ModelSelector.propTypes = {
  selectedModelId: PropTypes.string.isRequired,
  setSelectedModelId: PropTypes.func.isRequired,
  activeSystemPromptName: PropTypes.string.isRequired,
  onOpenSystemPrompt: PropTypes.func.isRequired,
  onOpenParams: PropTypes.func.isRequired,
}
