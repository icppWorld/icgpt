// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

// A subtle "the canister is working" status line, rendered inline in the
// conversation, just under the streaming assistant reply. Replaces the old
// full-screen astronaut animation, which got in the way.
export function WorkingIndicator({ message }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        margin: '4px 2px',
      }}
    >
      <style>{`
        @keyframes icgptBlink { 0%, 100% { opacity: 1 } 50% { opacity: 0.15 } }
        .icgpt-working { animation: icgptBlink 1.1s ease-in-out infinite; }
      `}</style>
      <span
        className="icgpt-working"
        style={{ fontSize: '12px', color: '#6272a4', letterSpacing: '0.02em' }}
      >
        <span style={{ color: '#bd93f9' }}>▌</span> {message}
      </span>
    </div>
  )
}

WorkingIndicator.propTypes = {
  message: PropTypes.string.isRequired,
}
