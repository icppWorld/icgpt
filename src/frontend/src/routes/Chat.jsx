// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Helmet } from 'react-helmet'
import { useOutletContext } from 'react-router-dom'
import 'dracula-ui/styles/dracula-ui.css'

import { StatsBar } from '../common/StatsBar'
import { CardError } from '../common/CardError'
import { ModelSelector } from '../common/ModelSelector'
import { getModelById } from '../common/models'
import { getPromptById } from '../common/systemPrompts'
import { ChatOutput } from './ChatOutput'
import { ChatNewChat } from './ChatNewChat'
import { Chats } from './Chats'
import { ChatInput } from './ChatInput'
import { SystemPromptModal } from './SystemPromptModal'
import { ParametersModal } from './ParametersModal'
import { AdminPanel } from './AdminPanel'
import { doNewChatLlamacpp } from '../canisters/llamacpp'

const DEBUG = true

export function Chat() {
  const { authClient, setAuthClient } = useOutletContext()
  const { access } = useOutletContext()
  const { doLogout } = useOutletContext()
  const { actorRef, setActorRef } = useOutletContext()
  const { chatNew, setChatNew } = useOutletContext()
  const { chatDone, setChatDone } = useOutletContext()
  const { selectedModelId, setSelectedModelId } = useOutletContext()
  const { customPrompts, setCustomPrompts } = useOutletContext()
  const { activeSystemPromptId, setActiveSystemPromptId } = useOutletContext()
  const { activeSystemPromptText } = useOutletContext()
  const { params, setParams } = useOutletContext()
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

  const selectedModel = getModelById(selectedModelId)
  const activeSystemPromptName = getPromptById(
    customPrompts,
    activeSystemPromptId
  ).name

  // Switching models starts a fresh conversation: a chat is pinned to one LLM's
  // prompt cache (on that model's canister), so it cannot continue on another model.
  function handleModelChange(newModelId) {
    if (newModelId === selectedModelId) return
    setSelectedModelId(newModelId)
    doNewChatLlamacpp({
      setChatNew,
      setChatDone,
      setInputString,
      setInputPlaceholder,
      setChatOutputText,
      setMessages,
      setConversationBase,
      setStats,
      setChatDisplay,
    })
  }

  const [showSystemPromptModal, setShowSystemPromptModal] =
    React.useState(false)
  const [showParametersModal, setShowParametersModal] = React.useState(false)
  const [showAdminPanel, setShowAdminPanel] = React.useState(false)

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
          message={`ERROR: The on-chain LLM ${selectedModel.gguf} is not ready...`}
        />
      )
      break
    default:
      DisplayComponent = null
  }

  return (
    <div>
      <Helmet>
        <title>ICGPT — On-chain Prompt Studio</title>
      </Helmet>
      <main>
        <div className="container-fluid text-center">
          {/* All children below are position:fixed, so this wrapper only needs
              to exist - no box styling (a subtle Card left a faint empty outline). */}
          <div style={{ position: 'relative' }}>
            <ModelSelector
              selectedModelId={selectedModelId}
              setSelectedModelId={handleModelChange}
              activeSystemPromptName={activeSystemPromptName}
              onOpenSystemPrompt={() => setShowSystemPromptModal(true)}
              onOpenParams={() => setShowParametersModal(true)}
            />
            <div
              style={{
                position: 'fixed',
                top: '8px',
                right: '14px',
                zIndex: 960,
                display: 'flex',
                gap: '8px',
              }}
            >
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                title="Open the ICGPT docs in a new tab"
                style={{
                  backgroundColor: '#21222c',
                  color: '#8be9fd',
                  border: '1px solid #44475a',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <i className="bi bi-book" style={{ marginRight: '5px' }}></i>
                Docs
              </a>
              {access?.isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowAdminPanel(true)}
                  title="Admin panel"
                  style={{
                    backgroundColor: '#21222c',
                    color: '#ff79c6',
                    border: '1px solid #44475a',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <i
                    className="bi bi-shield-lock"
                    style={{ marginRight: '5px' }}
                  ></i>
                  Admin
                </button>
              ) : null}
              <button
                type="button"
                onClick={doLogout}
                title="Log out"
                aria-label="Log out"
                style={{
                  backgroundColor: '#21222c',
                  color: '#ff5555',
                  border: '1px solid #44475a',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </div>
            {DisplayComponent}
            <StatsBar
              turns={turns}
              updateCalls={stats.updateCalls}
              tokensIn={stats.tokensIn}
              tokensOut={stats.tokensOut}
              cyclesCost={stats.cyclesCost}
              genNs={stats.genNs}
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
              chats={chats}
              setChats={setChats}
            />
            {/* Chats (saved conversations) is deferred under the hard gate: it is
                caller-scoped on the LLM, so it needs controller-owned storage. */}
            {false && (
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
                chats={chats}
                setChats={setChats}
              />
            )}
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
              systemPromptText={activeSystemPromptText}
              selectedModel={selectedModel}
              params={params}
              chats={chats}
              setChats={setChats}
            />
          </div>
        </div>
      </main>
      {showSystemPromptModal ? (
        <SystemPromptModal
          customPrompts={customPrompts}
          setCustomPrompts={setCustomPrompts}
          activeSystemPromptId={activeSystemPromptId}
          setActiveSystemPromptId={setActiveSystemPromptId}
          onClose={() => setShowSystemPromptModal(false)}
          setChatNew={setChatNew}
          setChatDone={setChatDone}
          setInputString={setInputString}
          setInputPlaceholder={setInputPlaceholder}
          setChatOutputText={setChatOutputText}
          setMessages={setMessages}
          setConversationBase={setConversationBase}
          setStats={setStats}
          setChatDisplay={setChatDisplay}
        />
      ) : null}
      {showParametersModal ? (
        <ParametersModal
          params={params}
          setParams={setParams}
          selectedModel={selectedModel}
          onClose={() => setShowParametersModal(false)}
        />
      ) : null}
      {showAdminPanel ? (
        <AdminPanel
          authClient={authClient}
          initialEarlyAccess={access?.earlyAccess}
          onClose={() => setShowAdminPanel(false)}
        />
      ) : null}
    </div>
  )
}
