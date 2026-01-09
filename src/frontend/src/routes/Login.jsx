// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import 'dracula-ui/styles/dracula-ui.css'
import { Box, Card, Heading, Divider, Table } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { LogInWithInternetIdentity } from './LoginWithInternetIdentity'

export function Login({ setAuthClient }) {
  return (
    <div>
      <Helmet>
        <title>ICGPT</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          <Card
            variant="subtle"
            color="none"
            my="sm"
            p="md"
            // mx="sm"
            display="inline-block"
          >
            <Heading color="yellow" size="md">
              ICGPT
            </Heading>
            <Heading color="yellow" size="sm">
              on-chain LLMs
            </Heading>

            <LogInWithInternetIdentity setAuthClient={setAuthClient} />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
