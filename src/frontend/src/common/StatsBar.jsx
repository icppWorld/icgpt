// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { InfoPopover } from './InfoPopover'
import { useIsMobile } from './useIsMobile'
import { USD_PER_TRILLION_CYCLES, formatCycles } from './cycles'

// A subtle live stats line for the conversation, pinned just above the input,
// with an (i) popover explaining how each number is determined. cyclesCost and
// genNs are EXACT in-canister measurements the controller made around each LLM call.
export function StatsBar({
  turns,
  updateCalls,
  tokensIn,
  tokensOut,
  cyclesCost,
  genNs,
  heightChatInput,
}) {
  const isMobile = useIsMobile()

  if (updateCalls === 0 && turns === 0) return null

  const usd = (cyclesCost / 1e12) * USD_PER_TRILLION_CYCLES
  // tok/s = estimated tokens out / EXACT in-canister generation time (ns -> s).
  const tokPerSec = genNs > 0 ? (tokensOut / (genNs / 1e9)).toFixed(1) : null

  const style = {
    position: 'fixed',
    // Mobile: span the width and left-bound it so the line wraps instead of
    // running off the left edge. Desktop: a short right-aligned line.
    right: isMobile ? '12px' : '20px',
    left: isMobile ? '12px' : 'auto',
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
      <span>{updateCalls} in-canister calls</span>
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
          These numbers describe the current conversation with the on-chain LLM
          — it runs <em>in-canister</em>, literally inside an Internet Computer
          canister:
          <br />
          <br />
          <strong>turns</strong> — messages you have sent.
          <br />
          <strong>in-canister calls</strong> — update calls made to the canister
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
          <em>exact in-canister generation time</em>. The controller records the
          IC system time immediately before and after each LLM call, so this is
          the LLM&apos;s true generation speed — it excludes network round-trips
          and the controller itself.
          <br />
          <strong>cycles / $</strong> — the <em>exact</em> cycles the LLM spent,
          measured in-canister: the controller (the only caller allowed to reach
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
