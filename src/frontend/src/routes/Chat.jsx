// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading, Divider, Text } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { WaitAnimation } from '../common/WaitAnimation'
import { CardError } from '../common/CardError'
import { ChatSelectModel } from './ChatSelectModel'
import { ChatOutput } from './ChatOutput'
import { ChatNewChat } from './ChatNewChat'
import { ChatInput } from './ChatInput'

export function Chat() {
  const { authClient, setAuthClient } = useOutletContext()
  const { actorRef, setActorRef } = useOutletContext()
  const { chatNew, setChatNew } = useOutletContext()
  const { modelType, setModelType } = useOutletContext()
  const { modelSize, setModelSize } = useOutletContext()
  const { finetuneType, setFinetuneType } = useOutletContext()
  const { heightChatInput, setHeightChatInput } = useOutletContext()
  const { inputString, setInputString } = useOutletContext()
  const { inputPlaceholder, setInputPlaceholder } = useOutletContext()
  const { isSubmitting, setIsSubmitting } = useOutletContext()
  const { chatOutputText, setChatOutputText } = useOutletContext()
  const { chatDisplay, setChatDisplay } = useOutletContext()

  const identity = authClient.getIdentity()
  const principal = identity.getPrincipal()
  console.log('principal  : ' + principal)

  let DisplayComponent

  switch (chatDisplay) {
    case 'WaitAnimation':
      DisplayComponent = (
        <WaitAnimation message="Connecting to LLM canister..." />
      )
      break
    case 'SelectModel':
      DisplayComponent = (
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
      )
      break
    case 'ChatOutput':
      DisplayComponent = (
        <ChatOutput
          chatOutputText={chatOutputText}
          heightChatInput={heightChatInput}
        />
      )
      break
    case 'CanisterError':
      DisplayComponent = (
        <CardError message="ERROR: The LLM canister is not ready..." />
      )
      break
    default:
      DisplayComponent = null
  }

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
            {/* <Text color="yellow" size="md">
              ICGPT Labs
            </Text> */}
            {DisplayComponent}
            <ChatNewChat
              authClient={authClient}
              setAuthClient={setAuthClient}
              actorRef={actorRef}
              setActorRef={setActorRef}
              chatNew={chatNew}
              setChatNew={setChatNew}
              heightChatInput={heightChatInput}
              setHeightChatInput={setHeightChatInput}
              inputString={inputString}
              setInputString={setInputString}
              inputPlaceholder={inputPlaceholder}
              setInputPlaceholder={setInputPlaceholder}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              chatOutputText={chatOutputText}
              setChatOutputText={setChatOutputText}
              setChatDisplay={setChatDisplay}
            />
            <ChatInput
              authClient={authClient}
              setAuthClient={setAuthClient}
              actorRef={actorRef}
              setActorRef={setActorRef}
              chatNew={chatNew}
              setChatNew={setChatNew}
              heightChatInput={heightChatInput}
              setHeightChatInput={setHeightChatInput}
              inputString={inputString}
              setInputString={setInputString}
              inputPlaceholder={inputPlaceholder}
              setInputPlaceholder={setInputPlaceholder}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              chatOutputText={chatOutputText}
              setChatOutputText={setChatOutputText}
              setChatDisplay={setChatDisplay}
            />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
