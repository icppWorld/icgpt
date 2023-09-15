// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading, Divider } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { ChatInput } from './ChatInput'

export function ChatNow() {
  const { authClient, setAuthClient } = useOutletContext()
  const { modelType, modelSize, finetuneType } = useOutletContext()
  const { inputPlaceholder, setInputPlaceholder } = useOutletContext()
  const { prompt, setPrompt } = useOutletContext()

  const identity = authClient.getIdentity()
  const principal = identity.getPrincipal()
  console.log('principal  : ' + principal)

  return (
    <div>
      <Helmet>
        <title>ICGPT: ChatNow</title>
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
              on-chain LLMs
            </Heading>
            <Divider></Divider>
            {/* TODO - INSERT COMPONENT TO DISPLAY GENERATED TEXT */}
            <ChatInput
              inputPlaceholder={inputPlaceholder}
              prompt={prompt}
              setPrompt={setPrompt}
            />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
