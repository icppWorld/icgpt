// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

import 'dracula-ui/styles/dracula-ui.css'

import { AuthClient } from '@icp-sdk/auth/client'

// Internet Identity provider. @icp-sdk/auth 7.x uses this URL verbatim, so the
// `/authorize` path is required (5.x appended it for you). id.ai is the current II
// domain (same anchors/passkeys as identity.ic0.app); the user's principal is derived
// from THIS app's origin, not the II domain, so switching domains does not change it.
// Mainnet II works from local dev too — pocket-ic trusts mainnet subnet signatures.
const II_URL = 'https://id.ai/authorize'

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
