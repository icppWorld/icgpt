// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { InfoPopover } from './InfoPopover'

const USD_PER_TRILLION_CYCLES = 1.33 // ~1 XDR / 1T cycles, 1 XDR ~ $1.33

function formatCycles(cycles) {
  if (cycles >= 1e12) return `${(cycles / 1e12).toFixed(3)}T`
  if (cycles >= 1e9) return `${(cycles / 1e9).toFixed(2)}B`
  if (cycles >= 1e6) return `${(cycles / 1e6).toFixed(1)}M`
  if (cycles >= 1e3) return `${(cycles / 1e3).toFixed(0)}K`
  return `${cycles}`
}

// A subtle live stats line for the conversation, pinned just above the input,
// with an (i) popover explaining how each number is determined. cyclesCost and
// genNs are EXACT on-chain measurements the controller made around each LLM call.
export function StatsBar({
  turns,
  updateCalls,
  tokensIn,
  tokensOut,
  cyclesCost,
  genNs,
  heightChatInput,
}) {
  if (updateCalls === 0 && turns === 0) return null

  const usd = (cyclesCost / 1e12) * USD_PER_TRILLION_CYCLES
  // tok/s = estimated tokens out / EXACT on-chain generation time (ns -> s).
  const tokPerSec = genNs > 0 ? (tokensOut / (genNs / 1e9)).toFixed(1) : null

  const style = {
    position: 'fixed',
    right: '20px',
    bottom: `${(heightChatInput || 0) + 60}px`,
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
      <span>
        ~{tokensIn.toLocaleString()} in / ~{tokensOut.toLocaleString()} out
        tokens
      </span>
      {tokPerSec !== null ? (
        <>
          {sep}
          <span>~{tokPerSec} tok/s</span>
        </>
      ) : null}
      {sep}
      <span>
        {formatCycles(cyclesCost)} cycles (~${usd.toFixed(4)})
      </span>
      <span style={{ pointerEvents: 'auto' }}>
        <InfoPopover
          ariaLabel="How these stats are determined"
          width="360px"
          iconStyle={{
            fontSize: '14px',
            opacity: 1,
            color: '#16a34a', // green - readable on the light stats-bar band
            verticalAlign: 'middle',
            paddingLeft: '6px',
          }}
        >
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
          <strong>tokens in / out</strong> — <em>approximate</em>, estimated
          from word counts (~1.35 tokens/word). <strong>in</strong> = prompt
          tokens ingested (only the new part each turn; the cached conversation
          is reused). <strong>out</strong> = tokens generated. The canister does
          not report exact token counts.
          <br />
          <strong>tok/s</strong> — tokens out divided by the{' '}
          <em>exact on-chain generation time</em>. The controller records the IC
          system time immediately before and after each LLM call, so this is the
          LLM&apos;s true generation speed — it excludes network round-trips and
          the controller itself.
          <br />
          <strong>cycles / $</strong> — the <em>exact</em> cycles the LLM spent,
          measured on-chain: the controller (the only caller allowed to reach
          the LLM) reads the LLM&apos;s live cycle balance right before and
          after each call and sums the drop. Converted at ~1 XDR (~$1.33) per 1T
          cycles.
        </InfoPopover>
      </span>
    </div>
  )
}

StatsBar.propTypes = {
  turns: PropTypes.number.isRequired,
  updateCalls: PropTypes.number.isRequired,
  tokensIn: PropTypes.number.isRequired,
  tokensOut: PropTypes.number.isRequired,
  cyclesCost: PropTypes.number,
  genNs: PropTypes.number,
  heightChatInput: PropTypes.number,
}
