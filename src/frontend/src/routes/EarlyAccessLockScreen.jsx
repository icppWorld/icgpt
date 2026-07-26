// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'
import { Helmet } from 'react-helmet'
import { requestAccess } from '../canisters/admin'
import { Footer } from '../common/Footer'

const OPENCHAT_URL =
  'https://oc.app/community/mepna-eqaaa-aaaar-bclua-cai/channel/2881126157'

// Shown to a signed-in user who is NOT allowed during the early-access period
// (not an admin, not whitelisted). They describe their use case to request access,
// then join our OpenChat channel to discuss it with the team; an admin approves them
// onto the whitelist. Their principal is shown (copyable) to reference in the chat.
export function EarlyAccessLockScreen({
  authClient,
  access,
  onLogout,
  onRetry,
}) {
  const principalText = authClient.getIdentity().getPrincipal().toText()

  const [useCase, setUseCase] = React.useState('')
  const [submitted, setSubmitted] = React.useState(access?.requested === true)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState(null)
  const [copied, setCopied] = React.useState(false)

  async function submit() {
    setErr(null)
    if (!useCase.trim()) {
      setErr('Please describe your use case')
      return
    }
    setBusy(true)
    try {
      const res = await requestAccess(authClient, useCase.trim())
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
    let ok = false
    // Preferred path: the async Clipboard API (secure contexts). It can still be
    // blocked by the app's Permissions-Policy, so we fall back below.
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(principalText)
        ok = true
      }
    } catch (e) {
      /* fall through to the execCommand fallback */
    }
    // Fallback: a hidden textarea + execCommand('copy'). This works from a click
    // gesture even when the async Clipboard API is unavailable or policy-blocked.
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = principalText
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '-1000px'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ta.setSelectionRange(0, principalText.length)
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch (e) {
        ok = false
      }
    }
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
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
  const openChatBtn = {
    display: 'inline-block',
    marginTop: '10px',
    color: '#8be9fd',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 'bold',
  }

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
            <div style={{ marginTop: '18px', textAlign: 'left' }}>
              <p style={{ fontSize: '13px', lineHeight: 1.5 }}>
                Request received. To move forward, join our OpenChat channel and
                open a discussion — mention your principal id (below) so we can
                review your use case together and, once approved, enable your
                access.
              </p>
              <a
                href={OPENCHAT_URL}
                target="_blank"
                rel="noreferrer"
                style={openChatBtn}
              >
                Open a discussion on OpenChat →
              </a>
            </div>
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
                ICGPT is in early access. Tell us how you&apos;d like to use it.
              </p>
              <textarea
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Describe your use case — what would you like to build or explore with on-chain LLMs?"
                rows={4}
                maxLength={1000}
                style={{ ...input, width: '100%', resize: 'vertical' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  style={{
                    ...btn('#bd93f9', '#21222c'),
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {busy ? 'Submitting…' : 'Request access'}
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

              <div
                style={{
                  marginTop: '14px',
                  backgroundColor: '#282a36',
                  border: '1px solid #44475a',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <p style={{ fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                  Access is granted after a chat with the team. Join our
                  OpenChat channel and open a discussion — reference your
                  principal id (below). We&apos;ll review your use case there
                  and enable your access if approved.
                </p>
                <a
                  href={OPENCHAT_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={openChatBtn}
                >
                  Join us on OpenChat →
                </a>
              </div>
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
