// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { InfoPopover } from './InfoPopover'

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

// A subtle live stats line for the conversation, pinned just above the input,
// with an (i) popover explaining how each number is determined.
export function StatsBar({
  turns,
  updateCalls,
  tokens,
  genMs,
  heightChatInput,
}) {
  if (updateCalls === 0 && turns === 0) return null

  const cycles = updateCalls * CYCLES_PER_UPDATE_CALL
  const usd = (cycles / 1e12) * USD_PER_TRILLION_CYCLES
  const tokPerSec = genMs > 0 ? (tokens / (genMs / 1000)).toFixed(1) : null

  const style = {
    position: 'fixed',
    right: '20px',
    bottom: `${(heightChatInput || 0) + 34}px`,
    zIndex: 1001,
    fontSize: '11px',
    color: '#6272a4',
    letterSpacing: '0.02em',
    textAlign: 'right',
    // The line itself must not block the page; only the (i) is interactive.
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
      {tokPerSec !== null ? (
        <>
          {sep}
          <span>~{tokPerSec} tok/s</span>
        </>
      ) : null}
      {sep}
      <span>
        ~{formatCycles(cycles)} cycles (~${usd.toFixed(4)})
      </span>
      <span style={{ pointerEvents: 'auto' }}>
        <InfoPopover ariaLabel="How these stats are determined" width="340px">
          These numbers describe the current conversation with the on-chain LLM:
          <br />
          <br />
          <strong>turns</strong> — messages you have sent.
          <br />
          <strong>on-chain calls</strong> — update calls made to the canister
          (one <code>new_chat</code> per conversation, then repeated{' '}
          <code>run_update</code> calls that ingest your prompt and generate the
          reply in batches).
          <br />
          <strong>tokens</strong> — <em>approximate</em>, estimated from the
          word count (~1.35 tokens/word). The canister does not report exact
          token counts.
          <br />
          <strong>tok/s</strong> — tokens divided by the on-chain generation
          time (how fast the canister produced them; excludes network
          round-trips).
          <br />
          <strong>cycles / $</strong> — a <em>rough estimate</em>: ~
          {formatCycles(CYCLES_PER_UPDATE_CALL)} cycles per update call,
          converted at ~1 XDR (~$1.33) per 1T cycles. To be calibrated with real
          measurement.
        </InfoPopover>
      </span>
    </div>
  )
}

StatsBar.propTypes = {
  turns: PropTypes.number.isRequired,
  updateCalls: PropTypes.number.isRequired,
  tokens: PropTypes.number.isRequired,
  genMs: PropTypes.number,
  heightChatInput: PropTypes.number,
}
