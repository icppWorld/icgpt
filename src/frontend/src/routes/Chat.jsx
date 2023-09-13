// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading, Divider } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { ChatSelectModel } from './ChatSelectModel'

export function Chat() {
  const [authClient, setAuthClient] = useOutletContext()
  const [modelType, setModelType] = React.useState('Tiny')
  const [promptType, setPromptType] = React.useState('Continue')
  const [modelSize, setModelSize] = React.useState('15M')

  const identity = authClient.getIdentity()
  const principal = identity.getPrincipal()
  console.log('principal  : ' + principal)

  return (
    <div>
      <Helmet>
        <title>ICGPT: Chat</title>
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
            <ChatSelectModel
              modelType={modelType}
              setModelType={setModelType}
              promptType={promptType}
              setPromptType={setPromptType}
              modelSize={modelSize}
              setModelSize={setModelSize}
            />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
