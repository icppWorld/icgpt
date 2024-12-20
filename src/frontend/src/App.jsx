// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Head } from './common/Head'
import { Footer } from './common/Footer'
import { StagingBanner } from './common/StagingBanner'
import { Outlet } from 'react-router-dom'
import { Login } from './routes/Login'

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

  // Chat
  const [chatDisplay, setChatDisplay] = React.useState('SelectModel')
  const [waitAnimationMessage, setWaitAnimationMessage] = React.useState(
    'Calling the on-chain LLM'
  )

  // ChatSelectModel
  const [chatNew, setChatNew] = React.useState(true)
  const [chatDone, setChatDone] = React.useState(false)
  const [modelType, setModelType] = React.useState('Qwen2.5')
  const [modelSize, setModelSize] = React.useState('0.5b_q8_0')
  const [finetuneType, setFinetuneType] = React.useState('Instruct')

  // ChatInput
  const [widthChatInput, setWidthChatInput] = React.useState('100%')
  const [heightChatInput, setHeightChatInput] = React.useState(0)
  const [inputString, setInputString] = React.useState('')
  const [inputPlaceholder, setInputPlaceholder] = React.useState(
    'Start your story (pretend to be 4 years old...)'
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // ChatOutput
  const [chatOutputText, setChatOutputText] = React.useState('')

  // for ChatsPopupModal
  const [chats, setChats] = React.useState()

  // ---------------------------------------------------------
  function print_state() {
    console.log('------------------------------------')
    console.log('chatNew              : ' + chatNew)
    console.log('chatDone             : ' + chatDone)
    console.log('modelType            : ' + modelType)
    console.log('modelSize            : ' + modelSize)
    console.log('finetuneType         : ' + finetuneType)
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
    modelType,
    modelSize,
    finetuneType,
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
          modelType,
          setModelType,
          modelSize,
          setModelSize,
          finetuneType,
          setFinetuneType,
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
