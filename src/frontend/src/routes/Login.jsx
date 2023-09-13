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
        <title>ICGPT: Login</title>
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
              ICGPT Labs
            </Heading>
            <Heading color="yellow" size="sm">
              experiments with on-chain LLMs
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
