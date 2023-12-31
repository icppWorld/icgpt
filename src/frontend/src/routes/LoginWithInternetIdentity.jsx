// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Button, Divider, Text } from 'dracula-ui'

import { AuthClient } from '@dfinity/auth-client'

import { writeAuthClientDetailsToConsole } from './LoginWithInternetIdentityDebug'

const II_URL = process.env.II_URL
const IC_HOST_URL = process.env.IC_HOST_URL

let authClient

export function LogInWithInternetIdentity({ setAuthClient }) {
  async function doLogIn() {
    authClient = await AuthClient.create()

    const handleSucess = () => {
      // Save the authClient for use in rest of application
      setAuthClient(authClient)
      //   writeAuthClientDetailsToConsole(authClient)
    }

    authClient.login({
      identityProvider: II_URL,
      onSuccess: handleSucess,
    })
  }

  return (
    <Card variant="subtle" color="black" p="none" m="none">
      <Divider></Divider>
      <Button variant="ghost" color="black" size="lg" p="2xl" onClick={doLogIn}>
        <img src="loop.svg" />
      </Button>

      <Divider></Divider>
      <Text color="white" size="xs">
        Login with your Internet Identity.
      </Text>
    </Card>
  )
}

LogInWithInternetIdentity.propTypes = {
  setAuthClient: PropTypes.func.isRequired,
}
