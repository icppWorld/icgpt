// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading, Divider } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { ChatSelectModel } from './ChatSelectModel'
import { ChatInput } from './ChatInput'

export function ChatNew() {
  const { authClient, setAuthClient } = useOutletContext()
  const { modelType, setModelType } = useOutletContext()
  const { modelSize, setModelSize } = useOutletContext()
  const { finetuneType, setFinetuneType } = useOutletContext()
  const { inputPlaceholder, setInputPlaceholder } = useOutletContext()
  const { prompt, setPrompt } = useOutletContext()

  const identity = authClient.getIdentity()
  const principal = identity.getPrincipal()
  console.log('principal  : ' + principal)

  return (
    <div>
      <Helmet>
        <title>ICGPT: ChatNew</title>
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
