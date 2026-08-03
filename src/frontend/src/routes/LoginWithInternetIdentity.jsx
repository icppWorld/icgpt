// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

import 'dracula-ui/styles/dracula-ui.css'

import { AuthClient } from '@icp-sdk/auth/client'
import { envValue } from '../canisters/agent'

// LOCAL-DEV ONLY dev sign-in. `__DEV_SIGN_IN__` is a webpack build-time literal (true only under
// `webpack serve`, false in the production build). Behind the literal, webpack dead-code-elimination
// drops the require AND the ./devSignIn module (with its Ed25519KeyIdentity import) from prod bundles
// entirely — the dev path is provably absent from production, not merely hidden at runtime.
const dev = __DEV_SIGN_IN__ ? require('./devSignIn') : null

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

// True only in a local-dev build (behind the build-time `__DEV_SIGN_IN__` literal, so it folds to
// `false` and dead-code-eliminates in production) AND at runtime when the dev server injected a
// local `ii_url` cookie on a *.localhost host — a double lock on the ⚙ dev-sign-in button.
export function isLocalDev() {
  try {
    return (
      __DEV_SIGN_IN__ &&
      !!envValue('ii_url') &&
      /(^|\.)localhost$/.test(window.location.hostname)
    )
  } catch (e) {
    return false
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
    setAuthClient(dev.makeDevAdapter(dev.makeDevIdentity()))
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
      {/* Gate on the `__DEV_SIGN_IN__` build-time literal directly: it folds to `false` in
          production, so Terser dead-code-eliminates this whole branch (and doDevLogIn). The
          runtime isLocalDev() is the second lock in a dev build. */}
      {__DEV_SIGN_IN__ && isLocalDev() ? (
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
