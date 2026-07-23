// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

// Rough, clearly-approximate cost model. Inference update calls are
// instruction-heavy; this is an ORDER-OF-MAGNITUDE placeholder to be calibrated
// with real measurement (or the upcoming get_memory_status / cost data from
// llama_cpp_canister). Shown with a leading "~".
const CYCLES_PER_UPDATE_CALL = 5_000_000_000 // ~5B cycles per on-chain update call
const USD_PER_TRILLION_CYCLES = 1.33 // ~1 XDR / 1T cycles, 1 XDR ~ $1.33

function formatCycles(cycles) {
  if (cycles >= 1e12) return `${(cycles / 1e12).toFixed(2)}T`
  if (cycles >= 1e9) return `${(cycles / 1e9).toFixed(1)}B`
  if (cycles >= 1e6) return `${(cycles / 1e6).toFixed(0)}M`
  return `${cycles}`
}

// A subtle live stats line for the conversation, pinned just above the input.
export function StatsBar({ turns, updateCalls, tokens, heightChatInput }) {
  if (updateCalls === 0 && turns === 0) return null

  const cycles = updateCalls * CYCLES_PER_UPDATE_CALL
  const usd = (cycles / 1e12) * USD_PER_TRILLION_CYCLES

  const style = {
    position: 'fixed',
    right: '20px',
    bottom: `${(heightChatInput || 0) + 34}px`,
    zIndex: 1001,
    fontSize: '11px',
    color: '#6272a4',
    letterSpacing: '0.02em',
    textAlign: 'right',
    pointerEvents: 'none',
  }

  const sep = <span style={{ opacity: 0.5 }}> · </span>

  return (
    <div style={style}>
      <span>
        {turns} {turns === 1 ? 'turn' : 'turns'}
      </span>
      {sep}
      <span>{updateCalls} on-chain calls</span>
      {sep}
      <span>~{tokens.toLocaleString()} tokens</span>
      {sep}
      <span>
        ~{formatCycles(cycles)} cycles (~${usd.toFixed(4)})
      </span>
    </div>
  )
}

StatsBar.propTypes = {
  turns: PropTypes.number.isRequired,
  updateCalls: PropTypes.number.isRequired,
  tokens: PropTypes.number.isRequired,
  heightChatInput: PropTypes.number,
}
