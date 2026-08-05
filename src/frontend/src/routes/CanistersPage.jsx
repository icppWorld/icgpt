// eslint-disable-next-line no-use-before-define
import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { getCyclesReport } from '../canisters/admin'
import { canisterIdFor } from '../canisters/agent'
import { formatCycles, usd } from '../common/cycles'
import { MODELS } from '../common/models'
import { Footer } from '../common/Footer'

// A canister is "low" (banner + pill) below 5 Trillion Cycles.
const LOW_CYCLES = 5e12
const DASH = 'https://dashboard.internetcomputer.org/canister/'

// Human description for a snapshot entry. `name` is either "icgpt_admin" or a gguf filename.
function describe(name) {
  if (name === 'icgpt_admin') {
    return {
      display: 'icgpt_admin',
      role: 'Controller & early-access gate — routes every inference call to the models, meters usage & cost, and holds the monitoring log.',
      link: null,
    }
  }
  const model = MODELS.find((m) => m.gguf === name)
  const display = name.replace(/\.gguf$/i, '')
  return {
    display,
    role: `On-chain LLM — runs ${display} fully inside an Internet Computer canister (llama.cpp).`,
    link: model ? model.hfUrl : null,
  }
}

// icgpt_admin's own snapshot entry carries an empty id (the frontend already knows it).
function idOf(entry) {
  if (entry.canisterId) return entry.canisterId
  if (entry.name === 'icgpt_admin') return canisterIdFor('icgpt_admin') || ''
  return ''
}

function agoLabel(updatedAtNs) {
  const ms = Number(updatedAtNs / 1000000n)
  if (!ms) return null
  const secs = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (secs < 90) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 90) return `${mins} min ago`
  return `${Math.round(mins / 60)}h ago`
}

const C = {
  page: {
    minHeight: '100vh',
    color: '#f8f8f2',
    fontFamily: 'monospace',
    maxWidth: '860px',
    margin: '0 auto',
    padding: '18px 20px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  h1: { fontSize: '22px', fontWeight: 'bold', color: '#f1fa8c', margin: 0 },
  lead: { color: '#6272a4', fontSize: '13px', margin: '6px 0 0' },
  link: { color: '#8be9fd', textDecoration: 'none', fontSize: '13px' },
  card: {
    backgroundColor: '#21222c',
    border: '1px solid #44475a',
    borderRadius: '10px',
    padding: '14px 16px',
    marginTop: '12px',
  },
  name: { fontSize: '15px', fontWeight: 'bold' },
  role: {
    color: '#6272a4',
    fontSize: '12px',
    margin: '4px 0 8px',
    lineHeight: 1.5,
  },
  id: {
    color: '#8be9fd',
    fontSize: '11px',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  cyc: { fontSize: '15px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  pill: {
    display: 'inline-block',
    marginLeft: '8px',
    padding: '1px 7px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 'bold',
    backgroundColor: '#ff555522',
    color: '#ff5555',
    border: '1px solid #ff555577',
  },
  banner: {
    backgroundColor: '#ff555518',
    border: '1px solid #ff5555',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '6px',
    fontSize: '13px',
    lineHeight: 1.5,
  },
}

export function CanistersPage() {
  const { authClient } = useOutletContext()
  const [report, setReport] = React.useState(null)
  const [err, setErr] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await getCyclesReport(authClient)
      setReport(r)
    } catch (e) {
      setErr(e && e.message ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [authClient])

  React.useEffect(() => {
    load()
  }, [load])

  const canisters = report ? report.canisters : []
  const low = canisters.filter((c) => Number(c.cycles) < LOW_CYCLES)
  const updated = report ? agoLabel(report.updatedAt) : null

  return (
    <div style={C.page}>
      <Helmet>
        <title>ICGPT — Canisters & Cycles</title>
      </Helmet>

      <div style={C.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/onicai-icon-logo.svg"
            alt="onicai"
            style={{ width: '30px', height: '30px' }}
          />
          <div>
            <h1 style={C.h1}>Canisters & Cycles</h1>
            <p style={C.lead}>
              The Internet Computer canisters that run ICGPT, and their live
              cycle balances{updated ? ` · updated ${updated}` : ''}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            ...C.link,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Low-cycles banner */}
      {low.length > 0 ? (
        <div style={{ ...C.banner, marginTop: '16px' }}>
          <strong style={{ color: '#ff5555' }}>
            ⚠ {low.length} canister{low.length > 1 ? 's' : ''} low on cycles
            (&lt; 5T)
          </strong>{' '}
          — top up to keep ICGPT running:{' '}
          {low.map((c, i) => {
            const id = idOf(c)
            return (
              <React.Fragment key={c.name}>
                {i > 0 ? ', ' : ''}
                <a
                  href={`${DASH}${id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...C.link, color: '#ffb86c' }}
                >
                  {describe(c.name).display} ({formatCycles(Number(c.cycles))})
                </a>
              </React.Fragment>
            )
          })}
          .
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: '#6272a4', marginTop: '20px' }}>Loading balances…</p>
      ) : err ? (
        <p style={{ color: '#ff5555', marginTop: '20px' }}>
          Couldn&apos;t load canister balances: {err}
        </p>
      ) : canisters.length === 0 ? (
        <p style={{ color: '#6272a4', marginTop: '20px' }}>
          No canisters reported yet — the on-chain snapshot refreshes every ~10
          minutes; check back shortly.
        </p>
      ) : (
        canisters.map((c) => {
          const meta = describe(c.name)
          const id = idOf(c)
          const cy = Number(c.cycles)
          const isLow = cy < LOW_CYCLES
          return (
            <div key={c.name} style={C.card}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                }}
              >
                <div style={C.name}>
                  {meta.display}
                  {isLow ? <span style={C.pill}>LOW</span> : null}
                </div>
                <div style={{ ...C.cyc, color: isLow ? '#ff5555' : '#50fa7b' }}>
                  {formatCycles(cy)} cycles{' '}
                  <span style={{ color: '#6272a4', fontWeight: 'normal' }}>
                    (~${usd(cy).toFixed(2)})
                  </span>
                </div>
              </div>
              <p style={C.role}>
                {meta.role}
                {meta.link ? (
                  <>
                    {' '}
                    <a
                      href={meta.link}
                      target="_blank"
                      rel="noreferrer"
                      style={C.link}
                    >
                      model card →
                    </a>
                  </>
                ) : null}
              </p>
              {id ? (
                <a
                  href={`${DASH}${id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={C.id}
                >
                  {id}
                </a>
              ) : null}
            </div>
          )
        })
      )}

      <p style={{ color: '#6272a4', fontSize: '11px', marginTop: '18px' }}>
        Balances are a snapshot refreshed on-chain every ~10 minutes. 1T cycles
        ≈ ${usd(1e12).toFixed(2)}. Canister ids link to the IC dashboard.
      </p>
      <Footer />
    </div>
  )
}
