// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { Helmet } from 'react-helmet'
import { requestAccess } from '../canisters/admin'
import { Footer } from '../common/Footer'

// Shown to a signed-in user who is NOT allowed during the early-access period
// (not an admin, not whitelisted). They submit a contact email to request access;
// an admin approves them onto the whitelist. Their principal is shown (copyable) so
// an admin can whitelist it directly.
export function EarlyAccessLockScreen({
  authClient,
  access,
  onLogout,
  onRetry,
}) {
  const principalText = authClient.getIdentity().getPrincipal().toText()

  const [email, setEmail] = React.useState('')
  const [submitted, setSubmitted] = React.useState(access?.requested === true)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState(null)
  const [copied, setCopied] = React.useState(false)

  async function submit() {
    setErr(null)
    if (!email.trim()) {
      setErr('Enter your email')
      return
    }
    setBusy(true)
    try {
      const res = await requestAccess(authClient, email.trim())
      if ('ok' in res) {
        setSubmitted(true)
      } else {
        setErr(res.err || 'Request failed')
      }
    } catch (e) {
      setErr(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function copyPrincipal() {
    try {
      await navigator.clipboard.writeText(principalText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      /* clipboard unavailable — the principal is selectable on screen */
    }
  }

  const wrap = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'monospace',
    color: '#f8f8f2',
  }
  const card = {
    width: 'min(480px, 92vw)',
    backgroundColor: '#21222c',
    border: '1px solid #ffb86c55',
    borderRadius: '12px',
    padding: '28px',
    textAlign: 'center',
  }
  const input = {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#282a36',
    color: '#f8f8f2',
    border: '1px solid #44475a',
    borderRadius: '8px',
    padding: '8px 10px',
    fontFamily: 'monospace',
    fontSize: '13px',
  }
  const btn = (bg, fg) => ({
    backgroundColor: bg,
    color: fg,
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
  })

  return (
    <div>
      <Helmet>
        <title>ICGPT — On-chain Prompt Studio · early access</title>
      </Helmet>
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            ICGPT — On-chain Prompt Studio
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ffb86c',
              marginTop: '4px',
            }}
          >
            Early access
          </div>

          {access?.error ? (
            <div style={{ marginTop: '18px' }}>
              <p style={{ fontSize: '13px', color: '#ff5555' }}>
                Couldn&apos;t verify your access right now.
              </p>
              <button
                type="button"
                style={{ ...btn('#bd93f9', '#21222c'), marginTop: '10px' }}
                onClick={onRetry}
              >
                Retry
              </button>
            </div>
          ) : submitted ? (
            <p style={{ fontSize: '13px', marginTop: '18px', lineHeight: 1.5 }}>
              Request received — an admin will review it and enable your access.
              You can close this page and come back later.
            </p>
          ) : (
            <div style={{ marginTop: '18px', textAlign: 'left' }}>
              <p
                style={{
                  fontSize: '13px',
                  color: '#6272a4',
                  textAlign: 'center',
                  marginBottom: '10px',
                }}
              >
                ICGPT is in early access. Submit your email to request access.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit()
                  }}
                  placeholder="you@example.com"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  style={input}
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  style={{
                    ...btn('#bd93f9', '#21222c'),
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  Request
                </button>
              </div>
              {err ? (
                <p
                  style={{
                    color: '#ff5555',
                    fontSize: '12px',
                    marginTop: '8px',
                    wordBreak: 'break-word',
                  }}
                >
                  {err}
                </p>
              ) : null}
            </div>
          )}

          <div
            style={{ borderTop: '1px solid #44475a', margin: '18px 0 12px' }}
          />
          <p
            style={{
              fontSize: '12px',
              color: '#6272a4',
              textAlign: 'left',
              marginBottom: '6px',
            }}
          >
            Your principal id:
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
            <code
              style={{
                flex: 1,
                minWidth: 0,
                wordBreak: 'break-all',
                textAlign: 'left',
                backgroundColor: '#282a36',
                border: '1px solid #44475a',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '11px',
              }}
            >
              {principalText}
            </code>
            <button
              type="button"
              onClick={copyPrincipal}
              aria-label="Copy principal"
              style={btn('#44475a', '#f8f8f2')}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <button
            type="button"
            onClick={onLogout}
            style={{
              ...btn('transparent', '#6272a4'),
              marginTop: '16px',
              fontSize: '12px',
            }}
          >
            Sign out / switch identity
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )
}

EarlyAccessLockScreen.propTypes = {
  authClient: PropTypes.object.isRequired,
  access: PropTypes.object,
  onLogout: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
}
