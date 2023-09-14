// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Head } from './common/Head'
import { Footer } from './common/Footer'
import { Navbar } from './common/Navbar'
import { StagingBanner } from './common/StagingBanner'
import { Outlet } from 'react-router-dom'
import { Login } from './routes/Login'
import { WaitAnimation } from './routes/WaitAnimation'

import 'bootstrap-icons/font/bootstrap-icons.css'

export function App() {
  // ---------------------------------------------------------
  // These props are all added to the App's context via Outlet

  // Authentication with internet identity
  const [authClient, setAuthClient] = React.useState()

  // ChatNew
  const [modelType, setModelType] = React.useState('TinyStories')
  const [modelSize, setModelSize] = React.useState('15M')
  const [finetuneType, setFinetuneType] = React.useState('LLM')
  const [inputPlaceholder, setInputPlaceholder] = React.useState(
    'Start your story (pretend to be 4 years old...)'
  )
  const [prompt, setPrompt] = React.useState('')
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
      <Outlet context={{
        authClient, setAuthClient,
        modelType, setModelType,
        modelSize, setModelSize,
        finetuneType, setFinetuneType,
        inputPlaceholder, setInputPlaceholder,
        prompt, setPrompt
      }}
      />
      {/* <StagingBanner /> */}
      <Footer />
    </div>
  )
}
