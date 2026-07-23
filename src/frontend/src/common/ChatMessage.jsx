// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

// One conversation bubble. User messages align right, ICGPT (assistant) left.
// Dracula palette, monospace inherited from the app.
export function ChatMessage({ role, content }) {
  const isUser = role === 'user'

  const wrap = {
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    margin: '6px 0',
  }

  const bubble = {
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: '12px',
    borderBottomRightRadius: isUser ? '3px' : '12px',
    borderBottomLeftRadius: isUser ? '12px' : '3px',
    whiteSpace: 'pre-wrap', // preserve the model's newlines
    wordBreak: 'break-word',
    textAlign: 'left',
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#f8f8f2',
    backgroundColor: isUser ? '#44475a' : '#21222c',
    border: isUser ? '1px solid #44475a' : '1px solid #343746',
  }

  return (
    <div style={wrap}>
      <div style={bubble}>{content}</div>
    </div>
  )
}

ChatMessage.propTypes = {
  role: PropTypes.oneOf(['user', 'assistant']).isRequired,
  content: PropTypes.string.isRequired,
}
