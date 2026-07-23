// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'
import { Card, Heading, Divider, Text } from 'dracula-ui'

import { Footer } from '../common/Footer'
import { StatsBar } from '../common/StatsBar'
import { CardError } from '../common/CardError'
import { ChatSelectModel } from './ChatSelectModel'
import { ChatOutput } from './ChatOutput'
import { ChatNewChat } from './ChatNewChat'
import { Chats } from './Chats'
import { ChatInput } from './ChatInput'

const DEBUG = true

export function Chat() {
  const { authClient, setAuthClient } = useOutletContext()
  const { actorRef, setActorRef } = useOutletContext()
  const { chatNew, setChatNew } = useOutletContext()
  const { chatDone, setChatDone } = useOutletContext()
  const { modelType, setModelType } = useOutletContext()
  const { modelSize, setModelSize } = useOutletContext()
  const { finetuneType, setFinetuneType } = useOutletContext()
  const { widthChatInput, setWidthChatInput } = useOutletContext()
  const { heightChatInput, setHeightChatInput } = useOutletContext()
  const { inputString, setInputString } = useOutletContext()
  const { inputPlaceholder, setInputPlaceholder } = useOutletContext()
  const { isSubmitting, setIsSubmitting } = useOutletContext()
  const { chatOutputText, setChatOutputText } = useOutletContext()
  const { messages, setMessages } = useOutletContext()
  const { conversationBaseRef, setConversationBase } = useOutletContext()
  const { stats, setStats } = useOutletContext()
  const { chatDisplay, setChatDisplay } = useOutletContext()
  const { waitAnimationMessage, setWaitAnimationMessage } = useOutletContext()
  const { chats, setChats } = useOutletContext()

  const identity = authClient.getIdentity()
  const principal = identity.getPrincipal()

  if (DEBUG) {
    console.log('DEBUG-FLOW: entered Chat.jsx Chat ')
    console.log('principal  : ' + principal)
  }

  // Turns = number of user messages in the conversation.
  const turns = (messages || []).filter((m) => m.role === 'user').length

  let DisplayComponent

  switch (chatDisplay) {
    case 'WaitAnimation':
      DisplayComponent = (
        <ChatOutput
          chatOutputText={chatOutputText}
          messages={messages}
          isWorking={true}
          workingMessage={waitAnimationMessage}
          heightChatInput={heightChatInput}
        />
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
          messages={messages}
          heightChatInput={heightChatInput}
        />
      )
      break
    case 'CanisterError':
      DisplayComponent = (
        <CardError
          message={`ERROR: The on-chain LLM ${modelType}-${modelSize}-${finetuneType} is not ready...`}
        />
      )
      break
    default:
      DisplayComponent = null
  }

  return (
    <div>
      <Helmet>
        <title>ICGPT - the OG of on-chain LLMs</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          <Card
            variant="subtle"
            color="none"
            my="sm"
            p="sm"
            display="inline-block"
            style={{ position: 'relative' }}
          >
            {DisplayComponent}
            <StatsBar
              turns={turns}
              updateCalls={stats.updateCalls}
              tokens={stats.tokens}
              heightChatInput={heightChatInput}
            />
            <ChatNewChat
              authClient={authClient}
              setAuthClient={setAuthClient}
              actorRef={actorRef}
              setActorRef={setActorRef}
              chatNew={chatNew}
              setChatNew={setChatNew}
              chatDone={chatDone}
              setChatDone={setChatDone}
              widthChatInput={widthChatInput}
              setWidthChatInput={setWidthChatInput}
              heightChatInput={heightChatInput}
              setHeightChatInput={setHeightChatInput}
              inputString={inputString}
              setInputString={setInputString}
              inputPlaceholder={inputPlaceholder}
              setInputPlaceholder={setInputPlaceholder}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              setChatOutputText={setChatOutputText}
              setMessages={setMessages}
              setConversationBase={setConversationBase}
              setStats={setStats}
              setChatDisplay={setChatDisplay}
              setWaitAnimationMessage={setWaitAnimationMessage}
              modelType={modelType}
              chats={chats}
              setChats={setChats}
            />
            <Chats
              authClient={authClient}
              setAuthClient={setAuthClient}
              actorRef={actorRef}
              setActorRef={setActorRef}
              chatNew={chatNew}
              setChatNew={setChatNew}
              chatDone={chatDone}
              setChatDone={setChatDone}
              widthChatInput={widthChatInput}
              setWidthChatInput={setWidthChatInput}
              heightChatInput={heightChatInput}
              setHeightChatInput={setHeightChatInput}
              inputString={inputString}
              setInputString={setInputString}
              inputPlaceholder={inputPlaceholder}
              setInputPlaceholder={setInputPlaceholder}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              setChatOutputText={setChatOutputText}
              setMessages={setMessages}
              setConversationBase={setConversationBase}
              setStats={setStats}
              setChatDisplay={setChatDisplay}
              setWaitAnimationMessage={setWaitAnimationMessage}
              modelType={modelType}
              modelSize={modelSize}
              finetuneType={finetuneType}
              chats={chats}
              setChats={setChats}
            />
            <ChatInput
              authClient={authClient}
              setAuthClient={setAuthClient}
              actorRef={actorRef}
              setActorRef={setActorRef}
              chatNew={chatNew}
              setChatNew={setChatNew}
              chatDone={chatDone}
              setChatDone={setChatDone}
              widthChatInput={widthChatInput}
              setWidthChatInput={setWidthChatInput}
              heightChatInput={heightChatInput}
              setHeightChatInput={setHeightChatInput}
              inputString={inputString}
              setInputString={setInputString}
              inputPlaceholder={inputPlaceholder}
              setInputPlaceholder={setInputPlaceholder}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
              setChatOutputText={setChatOutputText}
              setMessages={setMessages}
              conversationBaseRef={conversationBaseRef}
              setConversationBase={setConversationBase}
              setStats={setStats}
              setChatDisplay={setChatDisplay}
              setWaitAnimationMessage={setWaitAnimationMessage}
              modelType={modelType}
              modelSize={modelSize}
              finetuneType={finetuneType}
              chats={chats}
              setChats={setChats}
            />
          </Card>
        </div>
        <Footer />
      </main>
    </div>
  )
}
