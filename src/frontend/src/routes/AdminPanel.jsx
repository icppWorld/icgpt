// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import {
  listRequests,
  listWhitelist,
  listAdmins,
  setEarlyAccess as setEarlyAccessCall,
  approveRequest,
  rejectRequest,
  addToWhitelist,
  removeFromWhitelist,
  addAdmin,
  removeAdmin,
} from '../canisters/admin'

function fmtDate(at) {
  try {
    return new Date(Number(at / 1000000n)).toISOString().slice(0, 10)
  } catch (e) {
    return ''
  }
}

// Admin panel (admins only). Toggle early access, review/approve access requests,
// manage the whitelist, and manage runtime admins. All actions call the icgpt_admin
// canister (which re-checks admin server-side) then refresh the lists.
export function AdminPanel({ authClient, initialEarlyAccess, onClose }) {
  const [earlyAccess, setEarly] = React.useState(initialEarlyAccess === true)
  const [requests, setRequests] = React.useState([])
  const [whitelist, setWhitelist] = React.useState([])
  const [admins, setAdmins] = React.useState({ bootstrap: [], added: [] })
  const [err, setErr] = React.useState(null)
  const [busy, setBusy] = React.useState(false)

  // add-to-whitelist form
  const [wlP, setWlP] = React.useState('')
  const [wlEmail, setWlEmail] = React.useState('')
  const [wlNote, setWlNote] = React.useState('')
  // add-admin form
  const [adP, setAdP] = React.useState('')
  const [adWho, setAdWho] = React.useState('')

  const reload = React.useCallback(async () => {
    setErr(null)
    try {
      const [r, w, a] = await Promise.all([
        listRequests(authClient),
        listWhitelist(authClient),
        listAdmins(authClient),
      ])
      setRequests(r)
      setWhitelist(w)
      setAdmins(a)
    } catch (e) {
      setErr(String(e))
    }
  }, [authClient])

  React.useEffect(() => {
    reload()
  }, [reload])

  // Wrap a mutating action: run it, then refresh; surface errors.
  async function act(fn) {
    setBusy(true)
    setErr(null)
    try {
      await fn()
      await reload()
    } catch (e) {
      setErr(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function toggleEarly() {
    const next = !earlyAccess
    await act(async () => {
      await setEarlyAccessCall(authClient, next)
      setEarly(next)
    })
  }

  // ---- styles ------------------------------------------------------------
  const overlay = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
  }
  const card = {
    width: 'min(720px, 94vw)',
    maxHeight: '88vh',
    overflowY: 'auto',
    backgroundColor: '#21222c',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    padding: '18px 20px',
    textAlign: 'left',
    fontFamily: 'monospace',
    fontSize: '13px',
  }
  const h = { fontSize: '14px', fontWeight: 'bold', margin: '16px 0 6px' }
  const input = {
    backgroundColor: '#282a36',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '6px',
    padding: '5px 8px',
    fontFamily: 'monospace',
    fontSize: '12px',
    minWidth: 0,
  }
  const btn = (bg, fg) => ({
    backgroundColor: bg,
    color: fg,
    border: 'none',
    borderRadius: '6px',
    padding: '5px 10px',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
  })
  const row = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '6px 0',
    borderTop: '1px solid #33344a',
  }
  const mono = {
    flex: 1,
    minWidth: 0,
    wordBreak: 'break-all',
    fontSize: '11px',
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Admin</div>
          <button
            type="button"
            style={btn('#282a36', '#f8f8f2')}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {err ? (
          <p style={{ color: '#ff5555', fontSize: '12px', marginTop: '8px' }}>
            {err}
          </p>
        ) : null}

        {/* Early access toggle */}
        <div style={h}>Early access</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: earlyAccess ? '#ffb86c' : '#50fa7b' }}>
            {earlyAccess
              ? 'ON — only admins + whitelisted can use ICGPT'
              : 'OFF — open to everyone'}
          </span>
          <button
            type="button"
            style={btn('#bd93f9', '#21222c')}
            disabled={busy}
            onClick={toggleEarly}
          >
            {earlyAccess ? 'Open to everyone' : 'Turn early access ON'}
          </button>
        </div>

        {/* Requests */}
        <div style={h}>Pending requests ({requests.length})</div>
        {requests.length === 0 ? (
          <p style={{ color: '#6272a4', fontSize: '12px' }}>
            No pending requests.
          </p>
        ) : (
          requests.map((r) => (
            <div key={r.principal.toText()} style={row}>
              <div style={mono}>
                <div>{r.email || '(no email)'}</div>
                <div style={{ color: '#6272a4' }}>
                  {r.principal.toText()} · {fmtDate(r.at)}
                </div>
              </div>
              <button
                type="button"
                style={btn('#50fa7b', '#21222c')}
                disabled={busy}
                onClick={() =>
                  act(() => approveRequest(authClient, r.principal))
                }
              >
                Approve
              </button>
              <button
                type="button"
                style={btn('#44475a', '#f8f8f2')}
                disabled={busy}
                onClick={() =>
                  act(() => rejectRequest(authClient, r.principal))
                }
              >
                Reject
              </button>
            </div>
          ))
        )}

        {/* Whitelist */}
        <div style={h}>Whitelist ({whitelist.length})</div>
        {whitelist.map((w) => (
          <div key={w.principal.toText()} style={row}>
            <div style={mono}>
              <div>
                {w.email || '(no email)'}
                {w.note ? ` — ${w.note}` : ''}
              </div>
              <div style={{ color: '#6272a4' }}>{w.principal.toText()}</div>
            </div>
            <button
              type="button"
              style={btn('#ff5555', '#f8f8f2')}
              disabled={busy}
              onClick={() =>
                act(() => removeFromWhitelist(authClient, w.principal))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ ...row, flexWrap: 'wrap' }}>
          <input
            style={{ ...input, flex: '2 1 260px' }}
            placeholder="principal to whitelist"
            value={wlP}
            onChange={(e) => setWlP(e.target.value)}
          />
          <input
            style={{ ...input, flex: '1 1 140px' }}
            placeholder="email"
            value={wlEmail}
            onChange={(e) => setWlEmail(e.target.value)}
          />
          <input
            style={{ ...input, flex: '1 1 120px' }}
            placeholder="note"
            value={wlNote}
            onChange={(e) => setWlNote(e.target.value)}
          />
          <button
            type="button"
            style={btn('#bd93f9', '#21222c')}
            disabled={busy || !wlP.trim()}
            onClick={() =>
              act(async () => {
                await addToWhitelist(
                  authClient,
                  wlP.trim(),
                  wlEmail.trim(),
                  wlNote.trim()
                )
                setWlP('')
                setWlEmail('')
                setWlNote('')
              })
            }
          >
            Add
          </button>
        </div>

        {/* Admins */}
        <div style={h}>Admins</div>
        {admins.bootstrap.map((a) => (
          <div key={a.principal.toText()} style={row}>
            <div style={mono}>
              <div>{a.who || '(founder)'}</div>
              <div style={{ color: '#6272a4' }}>
                {a.principal.toText()} · bootstrap (permanent)
              </div>
            </div>
          </div>
        ))}
        {admins.added.map((a) => (
          <div key={a.principal.toText()} style={row}>
            <div style={mono}>
              <div>{a.who || '(admin)'}</div>
              <div style={{ color: '#6272a4' }}>{a.principal.toText()}</div>
            </div>
            <button
              type="button"
              style={btn('#ff5555', '#f8f8f2')}
              disabled={busy}
              onClick={() => act(() => removeAdmin(authClient, a.principal))}
            >
              Remove
            </button>
          </div>
        ))}
        <div style={{ ...row, flexWrap: 'wrap' }}>
          <input
            style={{ ...input, flex: '2 1 260px' }}
            placeholder="principal to grant admin"
            value={adP}
            onChange={(e) => setAdP(e.target.value)}
          />
          <input
            style={{ ...input, flex: '1 1 140px' }}
            placeholder="who"
            value={adWho}
            onChange={(e) => setAdWho(e.target.value)}
          />
          <button
            type="button"
            style={btn('#bd93f9', '#21222c')}
            disabled={busy || !adP.trim()}
            onClick={() =>
              act(async () => {
                await addAdmin(authClient, adP.trim(), adWho.trim())
                setAdP('')
                setAdWho('')
              })
            }
          >
            Add admin
          </button>
        </div>
      </div>
    </div>
  )
}

AdminPanel.propTypes = {
  authClient: PropTypes.object.isRequired,
  initialEarlyAccess: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
}
