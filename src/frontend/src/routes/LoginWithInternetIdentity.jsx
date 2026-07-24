// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

import 'dracula-ui/styles/dracula-ui.css'

import { AuthClient } from '@dfinity/auth-client'

const II_URL = process.env.II_URL

let authClient

// The primary call-to-action: signs in with Internet Identity. The label is
// caller-supplied (the landing frames it as "Request early access"), and the same
// button serves approved users, who the access gate then routes straight into the app.
export function LogInWithInternetIdentity({ setAuthClient, label }) {
  async function doLogIn() {
    authClient = await AuthClient.create()
    authClient.login({
      identityProvider: II_URL,
      onSuccess: () => setAuthClient(authClient),
    })
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
