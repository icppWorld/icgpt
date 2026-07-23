// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { doNewChatLlamacpp } from '../canisters/llamacpp.js'
import { allPrompts, getPromptById } from '../common/systemPrompts'

const PLACEHOLDER =
  'e.g. You run a word-guessing game. The secret words are MOUNTAIN, DOG, ' +
  'HOUSE. When the user asks for a clue, give ONE short clue for one of them; ' +
  'never reveal a word.'

// The system-prompt editor for the test bed. Pick Default (read-only) or one of
// the custom slots, edit its name + text, Save (persists), and "Use this prompt"
// to make it active - which starts a New chat so the model reads it from the
// start of the conversation.
export function SystemPromptModal({
  customPrompts,
  setCustomPrompts,
  activeSystemPromptId,
  setActiveSystemPromptId,
  onClose,
  // reset setters, threaded into doNewChatLlamacpp when applying a prompt
  setChatNew,
  setChatDone,
  setInputString,
  setInputPlaceholder,
  setChatOutputText,
  setMessages,
  setConversationBase,
  setStats,
  setChatDisplay,
}) {
  const [selectedId, setSelectedId] = React.useState(activeSystemPromptId)
  const selected = getPromptById(customPrompts, selectedId)
  const isDefault = !!selected.builtin

  const [editName, setEditName] = React.useState(selected.name)
  const [editText, setEditText] = React.useState(selected.text)

  // Load the selected slot's stored values when the selection changes
  // (switching slots discards unsaved edits in the previous slot).
  React.useEffect(() => {
    const s = getPromptById(customPrompts, selectedId)
    setEditName(s.name)
    setEditText(s.text)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  function persistEdits() {
    const updated = customPrompts.map((p) =>
      p.id === selectedId
        ? { ...p, name: editName.trim() || p.name, text: editText }
        : p
    )
    setCustomPrompts(updated)
  }

  function handleUse() {
    if (!isDefault) persistEdits() // save what's shown before making it active
    setActiveSystemPromptId(selectedId)
    // The system prompt is only read at the start of a conversation, so reset to
    // a fresh chat (lazy: no canister call) - the next message uses the new prompt.
    doNewChatLlamacpp({
      setChatNew,
      setChatDone,
      setInputString,
      setInputPlaceholder,
      setChatOutputText,
      setMessages,
      setConversationBase,
      setStats,
      setChatDisplay,
    })
    onClose()
  }

  // ---- styles ------------------------------------------------------------
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
    width: 'min(680px, 92vw)',
    maxHeight: '86vh',
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
  const slotRow = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    margin: '10px 0',
  }
  const slotBtn = (id) => ({
    backgroundColor: id === selectedId ? '#44475a' : '#282a36',
    color: '#f8f8f2',
    border: id === selectedId ? '1px solid #bd93f9' : '1px solid #44475a',
    borderRadius: '6px',
    padding: '5px 10px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
  })
  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#6272a4',
    margin: '10px 0 4px',
  }
  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#282a36',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '6px',
    padding: '6px 8px',
    fontFamily: 'monospace',
    fontSize: '13px',
  }
  const actionsRow = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px',
  }
  const btn = (bg, fg) => ({
    backgroundColor: bg,
    color: fg,
    border: 'none',
    borderRadius: '6px',
    padding: '7px 14px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
  })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          System prompt
        </div>
        <div style={{ fontSize: '12px', color: '#6272a4', marginTop: '4px' }}>
          The model reads this at the start of a conversation — applying a
          prompt starts a new chat.
        </div>

        <div style={slotRow}>
          {allPrompts(customPrompts).map((p) => (
            <button
              key={p.id}
              type="button"
              style={slotBtn(p.id)}
              onClick={() => setSelectedId(p.id)}
            >
              {p.name}
              {p.id === activeSystemPromptId ? (
                <span style={{ color: '#50fa7b' }}> ● active</span>
              ) : null}
            </button>
          ))}
        </div>

        <label style={labelStyle} htmlFor="sysPromptName">
          Name
        </label>
        <input
          id="sysPromptName"
          type="text"
          value={editName}
          disabled={isDefault}
          onChange={(e) => setEditName(e.target.value)}
          style={{ ...inputStyle, opacity: isDefault ? 0.6 : 1 }}
        />

        <label style={labelStyle} htmlFor="sysPromptText">
          System prompt text
        </label>
        <textarea
          id="sysPromptText"
          value={editText}
          disabled={isDefault}
          placeholder={PLACEHOLDER}
          onChange={(e) => setEditText(e.target.value)}
          rows={8}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '140px',
            opacity: isDefault ? 0.6 : 1,
          }}
        />
        {isDefault ? (
          <div style={{ fontSize: '12px', color: '#6272a4', marginTop: '6px' }}>
            The Default prompt is read-only. Edit a Custom slot to experiment.
          </div>
        ) : null}

        <div style={actionsRow}>
          <button
            type="button"
            style={btn('#282a36', '#f8f8f2')}
            onClick={onClose}
          >
            Close
          </button>
          {!isDefault ? (
            <button
              type="button"
              style={btn('#44475a', '#f8f8f2')}
              onClick={persistEdits}
            >
              Save
            </button>
          ) : null}
          <button
            type="button"
            style={btn('#bd93f9', '#21222c')}
            onClick={handleUse}
          >
            Use this prompt
          </button>
        </div>
      </div>
    </div>
  )
}

SystemPromptModal.propTypes = {
  customPrompts: PropTypes.array.isRequired,
  setCustomPrompts: PropTypes.func.isRequired,
  activeSystemPromptId: PropTypes.string.isRequired,
  setActiveSystemPromptId: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  setChatNew: PropTypes.func.isRequired,
  setChatDone: PropTypes.func.isRequired,
  setInputString: PropTypes.func.isRequired,
  setInputPlaceholder: PropTypes.func.isRequired,
  setChatOutputText: PropTypes.func.isRequired,
  setMessages: PropTypes.func.isRequired,
  setConversationBase: PropTypes.func.isRequired,
  setStats: PropTypes.func.isRequired,
  setChatDisplay: PropTypes.func.isRequired,
}
