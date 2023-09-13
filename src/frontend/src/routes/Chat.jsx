// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading, Divider } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { ChatSelectModel } from './ChatSelectModel'
import { ChatInput } from './ChatInput'

export function Chat() {
  const [authClient, setAuthClient] = useOutletContext()
  const [modelType, setModelType] = React.useState('Tiny')
  const [modelSize, setModelSize] = React.useState('15M')
  const [finetuneType, setFinetuneType] = React.useState('LLM')
  const [inputPlaceholder, setInputPlaceholder] = React.useState(
    'Start your story (pretend to be 4 years old...)'
  )

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
              modelSize={modelSize}
              setModelSize={setModelSize}
              finetuneType={finetuneType}
              setFinetuneType={setFinetuneType}
              inputPlaceholder={inputPlaceholder}
              setInputPlaceholder={setInputPlaceholder}
            />
            <ChatInput inputPlaceholder={inputPlaceholder} />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
