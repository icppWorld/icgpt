// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading, Divider } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { LogInWithInternetIdentity } from './LoginWithInternetIdentity'

export function Login({ setAuthClient }) {
  return (
    <div>
      <Helmet>
        <title>icgpt: Login</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          <Card
            variant="subtle"
            color="none"
            my="sm"
            p="sm"
            display="inline-block"
          >
            <Heading color="white" size="xl">
              icgpt
            </Heading>
            <Heading color="yellow" size="sm">
              secure, on-chain chat
            </Heading>
            <Divider></Divider>
            <LogInWithInternetIdentity setAuthClient={setAuthClient} />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
