// eslint-disable-next-line no-use-before-define
import React from 'react'
import PropTypes from 'prop-types'

import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Button, Divider, Text } from 'dracula-ui'

import { AuthClient } from '@dfinity/auth-client'

import { canisterId, createActor } from 'DeclarationsCanisterMotoko'

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
    <Box>
      <Card variant="subtle" color="purple" p="md" m="md">
        <Box>
          <Text color="white">Login with your Internet Identity: </Text>
        </Box>

        <Divider></Divider>
        <Button
          variant="ghost"
          color="black"
          size="lg"
          p="2xl"
          onClick={doLogIn}
        >
          <img src="loop.svg" />
        </Button>
      </Card>
    </Box>
  )
}

LogInWithInternetIdentity.propTypes = {
  setAuthClient: PropTypes.func.isRequired,
}
