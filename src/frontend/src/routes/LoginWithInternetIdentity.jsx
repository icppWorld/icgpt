// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

import 'dracula-ui/styles/dracula-ui.css'

import { AuthClient } from '@icp-sdk/auth/client'
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity'
import { envValue } from '../canisters/agent'

// Internet Identity provider. @icp-sdk/auth 7.x uses this URL verbatim, so the
// `/authorize` path is required (5.x appended it for you). In PRODUCTION this is
// mainnet id.ai; in LOCAL dev the webpack dev server injects `ii_url` (the local II at
// http://id.ai.localhost:<port>/authorize) into the ic_env cookie, so testers sign in
// against a throwaway local II — no real passkey / real anchor needed. The user's
// principal is derived from THIS app's origin, not the II domain.
const II_URL = envValue('ii_url') || 'https://id.ai/authorize'

// Delegation lifetime: 8 hours, in nanoseconds.
const MAX_TIME_TO_LIVE = BigInt(8) * BigInt(3_600_000_000_000)

// The rest of the app was written against the old @dfinity/auth-client object: a
// SYNC getIdentity() and logout(). @icp-sdk/auth's getIdentity() is async and it uses
// signIn()/signOut(). Rather than touch every consumer (Chat, EarlyAccessLockScreen,
// admin.js, llamacpp.js, App.jsx), we wrap the client ONCE here into an adapter with
// the legacy surface: getIdentity() returns the identity captured at sign-in.
function makeAuthAdapter(client, identity) {
  return {
    getIdentity: () => identity,
    logout: () => client.signOut(),
    _client: client,
  }
}

// ---- LOCAL-DEV ONLY: sign in with a generated key identity, no Internet Identity ----
// This exists solely so local development/testing (and headless automation) can get an
// authenticated session with one click, skipping the II passkey ceremony. It is gated to
// local dev — shown ONLY when the dev server injected a local `ii_url` cookie AND the host
// is *.localhost. In production `ii_url` is absent, so this path never renders or runs.
// The generated Ed25519 identity persists in localStorage (stable principal across reloads).
const LS_DEV_IDENTITY = 'icgpt.dev.identity'

export function isLocalDev() {
  try {
    return (
      !!envValue('ii_url') && /(^|\.)localhost$/.test(window.location.hostname)
    )
  } catch (e) {
    return false
  }
}

function loadOrCreateDevIdentity() {
  try {
    const raw = window.localStorage.getItem(LS_DEV_IDENTITY)
    if (raw) return Ed25519KeyIdentity.fromJSON(raw)
  } catch (e) {
    // fall through to generate a fresh one
  }
  const id = Ed25519KeyIdentity.generate()
  try {
    window.localStorage.setItem(LS_DEV_IDENTITY, JSON.stringify(id.toJSON()))
  } catch (e) {
    // ignore storage failures — an in-memory identity still works this session
  }
  return id
}

// Same legacy surface as makeAuthAdapter, but backed by a local key identity (no II
// client). logout() keeps the stored identity so the principal is stable across sessions.
function makeDevAdapter(identity) {
  return {
    getIdentity: () => identity,
    logout: () => {},
    _dev: true,
  }
}

// The primary call-to-action: signs in with Internet Identity. The label is
// caller-supplied (the landing frames it as "Request early access"), and the same
// button serves approved users, who the access gate then routes straight into the app.
export function LogInWithInternetIdentity({ setAuthClient, label }) {
  async function doLogIn() {
    const client = new AuthClient({ identityProvider: II_URL })
    try {
      // signIn() resolves with the new Identity and rejects if the user closes the
      // popup or auth fails.
      const identity = await client.signIn({ maxTimeToLive: MAX_TIME_TO_LIVE })
      setAuthClient(makeAuthAdapter(client, identity))
    } catch (e) {
      console.warn('Internet Identity sign-in was not completed', e)
    }
  }

  function doDevLogIn() {
    setAuthClient(makeDevAdapter(loadOrCreateDevIdentity()))
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button
        type="button"
        onClick={doLogIn}
        style={{
          backgroundColor: '#bd93f9',
          color: '#21222c',
          border: 'none',
          borderRadius: '10px',
          padding: '12px 26px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#6272a4' }}>
        Sign in with Internet Identity — approved users go straight in.
      </div>
      {isLocalDev() ? (
        <div style={{ marginTop: '14px' }}>
          <button
            type="button"
            onClick={doDevLogIn}
            style={{
              backgroundColor: '#21222c',
              color: '#50fa7b',
              border: '1px dashed #50fa7b',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            ⚙ Dev sign-in (local key identity, no II)
          </button>
        </div>
      ) : null}
    </div>
  )
}

LogInWithInternetIdentity.propTypes = {
  setAuthClient: PropTypes.func.isRequired,
  label: PropTypes.string,
}

LogInWithInternetIdentity.defaultProps = {
  label: 'Sign in with Internet Identity',
}
