// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Head } from './common/Head'
import { Footer } from './common/Footer'
import { Navbar } from './common/Navbar'
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

  // ChatSelectModel
  const [chatNew, setChatNew] = React.useState(true)
  const [modelType, setModelType] = React.useState('TinyStories')
  const [modelSize, setModelSize] = React.useState('15M')
  const [finetuneType, setFinetuneType] = React.useState('LLM')

  // ChatInput
  const [heightChatInput, setHeightChatInput] = React.useState(0)
  const [inputString, setInputString] = React.useState('')
  const [inputPlaceholder, setInputPlaceholder] = React.useState(
    'Start your story (pretend to be 4 years old...)'
  )
  const promptRef = React.useRef() // Unused - DELETE (TODO)
  const setPromptRef = (value) => {
    promptRef.current = value
  }

  // ChatOutput
  const [chatOutputText, setChatOutputText] = React.useState('')



  // ---------------------------------------------------------
  function print_state() {
    console.log('------------------------------------')
    console.log('chatNew           : ' + chatNew)
    console.log('modelType         : ' + modelType)
    console.log('modelSize         : ' + modelSize)
    console.log('finetuneType      : ' + finetuneType)
    // console.log('inputString       : ' + inputString)
    console.log('inputPlaceholder  : ' + inputPlaceholder)
    console.log('chatDisplay       : ' + chatDisplay)
    console.log('heightChatInput   : ' + heightChatInput)
  }

  // state updates are asynchronous, so call dependent ones with useEffect
  React.useEffect(() => {
    print_state()
  }, [
    chatNew,
    modelType,
    modelSize,
    finetuneType,
    inputPlaceholder,
    chatDisplay,
    heightChatInput
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
      {/* <Navbar
        authClient={authClient}
        setAuthClient={setAuthClient}
      /> */}
      <Outlet
        context={{
          authClient,
          setAuthClient,
          actorRef,
          setActorRef,
          chatNew,
          setChatNew,
          modelType,
          setModelType,
          modelSize,
          setModelSize,
          finetuneType,
          setFinetuneType,
          heightChatInput,
          setHeightChatInput,
          inputString,
          setInputString,
          inputPlaceholder,
          setInputPlaceholder,
          promptRef,
          setPromptRef,
          chatOutputText,
          setChatOutputText,
          chatDisplay,
          setChatDisplay,
        }}
      />
      {/* <StagingBanner /> */}
      <Footer />
    </div>
  )
}
