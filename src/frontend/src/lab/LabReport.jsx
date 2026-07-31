// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { formatCycles, usd } from '../common/cycles'

const C = {
  card: '#21222c',
  border: '#44475a',
  text: '#f8f8f2',
  dim: '#6272a4',
  head: '#f1fa8c',
  accent: '#8be9fd',
  pass: '#50fa7b',
  fail: '#ff5555',
}

function bindingLabel(binding) {
  const keys = Object.keys(binding || {})
  if (!keys.length) return '(no variables)'
  return keys.map((k) => `${k}=${binding[k]}`).join(' · ')
}

// Aggregate programmatic pass-rate across all bindings' samples.
function overallPassRate(bindings) {
  let pass = 0
  let resolved = 0
  for (const b of bindings) {
    pass += b.passes
    resolved += b.passes + b.fails
  }
  return resolved > 0 ? { rate: pass / resolved, pass, resolved } : null
}

function Hero({ label, big, sub }) {
  return (
    <div
      style={{
        flex: '1 1 180px',
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '10px',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: '12px', color: C.dim, marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: C.head }}>
        {big}
      </div>
      {sub ? (
        <div style={{ fontSize: '12px', color: C.text, marginTop: '4px' }}>
          {sub}
        </div>
      ) : null}
    </div>
  )
}
Hero.propTypes = {
  label: PropTypes.string.isRequired,
  big: PropTypes.node.isRequired,
  sub: PropTypes.node,
}

// The full detail for ONE experiment run: hero numbers + per-binding table.
export function LabReport({ report }) {
  if (!report) return null
  const pr = overallPassRate(report.bindings)
  const steadyUsd = usd(report.steadyStateCyclesCost)

  return (
    <div style={{ color: C.text }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <Hero
          label="One-time warm-up (fixed prefix)"
          big={`${formatCycles(report.oneTimeCyclesCost)} cyc`}
          sub={`~$${usd(report.oneTimeCyclesCost).toFixed(4)} · paid once${
            report.oneTimeTokensExact !== null &&
            report.oneTimeTokensExact !== undefined
              ? ` · ${report.oneTimeTokensExact} prompt tok`
              : ''
          }`}
        />
        <Hero
          label="Steady-state per request"
          big={`${formatCycles(report.steadyStateCyclesCost)} cyc`}
          sub={`~$${steadyUsd.toFixed(4)} / req · ~$${(
            steadyUsd * 1000
          ).toFixed(2)} / 1k`}
        />
        <Hero
          label="Quality pass-rate"
          big={pr ? `${Math.round(pr.rate * 100)}%` : '—'}
          sub={pr ? `${pr.pass}/${pr.resolved} passed` : 'manual / no rules'}
        />
      </div>

      {report.exact ? (
        <div
          style={{
            marginTop: '12px',
            fontSize: '12px',
            color: C.dim,
            lineHeight: 1.6,
          }}
        >
          Analyzer (exact): cache reused through {report.exact.cachedTokens}{' '}
          tokens · re-ingested {report.exact.reingestTokens} tokens/trial (
          {report.exact.pctReingested}% of the prompt)
          {report.exact.genTokens !== null &&
          report.exact.genTokens !== undefined
            ? ` + ~${report.exact.genTokens} generated`
            : ' + generation'}
          . Move swept variables later to shrink the re-ingested suffix.
        </div>
      ) : report.placement ? (
        <div
          style={{
            marginTop: '12px',
            fontSize: '12px',
            color: C.dim,
            lineHeight: 1.6,
          }}
        >
          Analyzer (estimated): cache reused through ~
          {report.placement.estCachedTokens} tokens · re-ingested ~
          {report.placement.estReingestTokens} tokens/trial (
          {report.placement.pctReingested}% of the prompt) + generation. Move
          swept variables later to shrink the re-ingested suffix.
        </div>
      ) : null}

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '14px',
          fontSize: '13px',
        }}
      >
        <thead>
          <tr style={{ color: C.dim, textAlign: 'left' }}>
            <th style={th}>Trial</th>
            <th style={th}>Cost / req</th>
            <th style={th}>gen tok</th>
            <th style={th}>Quality</th>
            <th style={th}>Reply (first sample)</th>
          </tr>
        </thead>
        <tbody>
          {report.bindings.map((b, i) => {
            const rate =
              b.passRate === null ? null : Math.round(b.passRate * 100)
            const first = b.samples[0]
            return (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={td}>{bindingLabel(b.binding)}</td>
                <td style={td}>
                  {formatCycles(b.meanCyclesCost)}
                  <span style={{ color: C.dim }}>
                    {' '}
                    (~${usd(b.meanCyclesCost).toFixed(4)})
                  </span>
                </td>
                <td style={td}>
                  {b.meanGenTokensExact !== null &&
                  b.meanGenTokensExact !== undefined
                    ? b.meanGenTokensExact
                    : `~${b.meanGenTokensEst}`}
                </td>
                <td style={td}>
                  {b.empties === b.samples.length ? (
                    <span style={{ color: C.dim }}>empty (no answer)</span>
                  ) : rate === null ? (
                    <span style={{ color: C.dim }}>manual</span>
                  ) : (
                    <span style={{ color: rate === 100 ? C.pass : C.fail }}>
                      {report.kSamples > 1
                        ? `${rate}% (${b.passes}/${b.passes + b.fails})`
                        : rate === 100
                        ? '✓ pass'
                        : '✗ fail'}
                    </span>
                  )}
                  {b.meanJudgeScore !== null &&
                  b.meanJudgeScore !== undefined ? (
                    <span
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: C.accent,
                        marginTop: '2px',
                      }}
                      title="Mean on-chain LLM-judge score"
                    >
                      ⚖ {b.meanJudgeScore}/100
                    </span>
                  ) : null}
                </td>
                <td
                  style={{ ...td, color: C.text, maxWidth: '340px' }}
                  title={first ? first.reply : ''}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: '340px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'bottom',
                    }}
                  >
                    {first ? first.reply : ''}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
LabReport.propTypes = { report: PropTypes.object }

const th = { padding: '6px 8px', fontWeight: 600 }
const td = { padding: '6px 8px', verticalAlign: 'top' }

// A compact side-by-side comparison of multiple runs (A/B/N) accumulated this session.
export function RunCompareTable({ runs, onClear }) {
  if (!runs || runs.length < 2) return null
  return (
    <div style={{ marginTop: '22px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ color: C.accent, fontWeight: 600 }}>
          Compare runs (A/B)
        </div>
        <button type="button" onClick={onClear} style={clearBtn}>
          Clear
        </button>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
          color: C.text,
        }}
      >
        <thead>
          <tr style={{ color: C.dim, textAlign: 'left' }}>
            <th style={th}>#</th>
            <th style={th}>Template</th>
            <th style={th}>Model</th>
            <th style={th}>One-time</th>
            <th style={th}>Steady $/req</th>
            <th style={th}>$/1k</th>
            <th style={th}>Pass-rate</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r, i) => {
            const pr = overallPassRate(r.bindings)
            const s = usd(r.steadyStateCyclesCost)
            return (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{r.template.name}</td>
                <td style={td}>{r.model}</td>
                <td style={td}>${usd(r.oneTimeCyclesCost).toFixed(4)}</td>
                <td style={td}>${s.toFixed(4)}</td>
                <td style={td}>${(s * 1000).toFixed(2)}</td>
                <td style={td}>{pr ? `${Math.round(pr.rate * 100)}%` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
RunCompareTable.propTypes = {
  runs: PropTypes.array,
  onClear: PropTypes.func,
}

const clearBtn = {
  background: '#21222c',
  color: '#8be9fd',
  border: '1px solid #44475a',
  borderRadius: '6px',
  padding: '3px 10px',
  fontSize: '12px',
  cursor: 'pointer',
}
