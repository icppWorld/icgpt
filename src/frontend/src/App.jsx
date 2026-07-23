// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Head } from './common/Head'
import { Footer } from './common/Footer'
import { StagingBanner } from './common/StagingBanner'
import { Outlet } from 'react-router-dom'
import { Login } from './routes/Login'
import { DEFAULT_MODEL_ID } from './common/models'

import 'bootstrap-icons/font/bootstrap-icons.css'

export function App() {
  // ---------------------------------------------------------
  // These props are all added to the App's context via Outlet
  // Notes:
  // (-) React.useState triggers a re-render when value changed by setter
  //
  // (-) React.useRef   does not trigger a re-render when value changes
  //                    we must define a setter ourselves

  // Authentication with internet identity
  const [authClient, setAuthClient] = React.useState()

  // actor for the selected LLM canister
  // -> see js bindings stored in src/declarations/canister (See README)
  const actorRef = React.useRef()
  const setActorRef = (value) => {
    actorRef.current = value
  }

  // Chat - opens straight into the conversation view (no model-select screen).
  const [chatDisplay, setChatDisplay] = React.useState('ChatOutput')
  const [waitAnimationMessage, setWaitAnimationMessage] = React.useState(
    'Calling the on-chain LLM'
  )

  // Selected model (see common/models.js). The model dropdown at the top of the
  // chat page drives this.
  const [chatNew, setChatNew] = React.useState(true)
  const [chatDone, setChatDone] = React.useState(false)
  const [selectedModelId, setSelectedModelId] = React.useState(DEFAULT_MODEL_ID)

  // ChatInput
  const [widthChatInput, setWidthChatInput] = React.useState('100%')
  const [heightChatInput, setHeightChatInput] = React.useState(0)
  const [inputString, setInputString] = React.useState('')
  const [inputPlaceholder, setInputPlaceholder] =
    React.useState('Message ICGPT')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // ChatOutput
  // chatOutputText is the IN-PROGRESS assistant reply that streams in.
  // messages holds the COMPLETED turns of the conversation (Qwen multi-turn).
  const [chatOutputText, setChatOutputText] = React.useState('')
  const [messages, setMessages] = React.useState([])

  // The exact `conversation` text the canister last returned, used as the
  // cache-matching prefix when continuing a multi-turn Qwen conversation.
  // useRef: mutated across async inference calls without triggering re-renders.
  const conversationBaseRef = React.useRef('')
  const setConversationBase = (value) => {
    conversationBaseRef.current = value
  }

  // Live conversation statistics (reset on New chat). turns is derived from
  // messages; the rest accumulate across the conversation. tokensIn = ingested
  // (prompt) tokens, tokensOut = generated tokens, genMs = cumulative generation
  // wall-time. tokens/sec = tokensOut / (genMs/1000).
  const [stats, setStats] = React.useState({
    updateCalls: 0,
    tokensIn: 0,
    tokensOut: 0,
    genMs: 0,
  })

  // for ChatsPopupModal
  const [chats, setChats] = React.useState()

  // ---------------------------------------------------------
  function print_state() {
    console.log('------------------------------------')
    console.log('chatNew              : ' + chatNew)
    console.log('chatDone             : ' + chatDone)
    console.log('selectedModelId      : ' + selectedModelId)
    // console.log('inputString       : ' + inputString)
    console.log('inputPlaceholder     : ' + inputPlaceholder)
    console.log('chatDisplay          : ' + chatDisplay)
    console.log('waitAnimationMessage : ' + waitAnimationMessage)
    console.log('widthChatInput       : ' + widthChatInput)
    console.log('heightChatInput      : ' + heightChatInput)
    console.log('isSubmitting         : ' + isSubmitting)
  }

  // state updates are asynchronous, so call dependent ones with useEffect
  React.useEffect(() => {
    print_state()
  }, [
    chatNew,
    chatDone,
    selectedModelId,
    inputPlaceholder,
    chatDisplay,
    waitAnimationMessage,
    heightChatInput,
    isSubmitting,
  ])

  // ---------------------------------------------------------

  if (!authClient) {
    return (
      <div>
        <Head />
        <Login setAuthClient={setAuthClient} />
      </div>
    )
  }

  return (
    <div>
      <Head />
      <Outlet
        context={{
          authClient,
          setAuthClient,
          actorRef,
          setActorRef,
          chatNew,
          setChatNew,
          chatDone,
          setChatDone,
          selectedModelId,
          setSelectedModelId,
          widthChatInput,
          setWidthChatInput,
          heightChatInput,
          setHeightChatInput,
          inputString,
          setInputString,
          inputPlaceholder,
          setInputPlaceholder,
          isSubmitting,
          setIsSubmitting,
          chatOutputText,
          setChatOutputText,
          messages,
          setMessages,
          conversationBaseRef,
          setConversationBase,
          stats,
          setStats,
          chatDisplay,
          setChatDisplay,
          waitAnimationMessage,
          setWaitAnimationMessage,
          chats,
          setChats,
        }}
      />
      {/* <StagingBanner /> */}
      <Footer />
    </div>
  )
}
