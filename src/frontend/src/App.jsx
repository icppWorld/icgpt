// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Head } from './common/Head'
import { Footer } from './common/Footer'
import { StagingBanner } from './common/StagingBanner'
import { Outlet } from 'react-router-dom'
import { Login } from './routes/Login'
import { EarlyAccessLockScreen } from './routes/EarlyAccessLockScreen'
import { getMyAccess } from './canisters/admin'
import { withRetry } from './canisters/retry'
import { DEFAULT_MODEL_ID } from './common/models'
import {
  loadCustomPrompts,
  saveCustomPrompts,
  loadActiveId,
  saveActiveId,
  getPromptById,
} from './common/systemPrompts'
import { loadParams, saveParams } from './common/params'

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

  // Early-access gate (icgpt_admin canister). access === null while we query the
  // caller's status after login. access.allowed drives the chat-vs-lock-screen branch;
  // access.isAdmin drives the Admin panel button.
  const [access, setAccess] = React.useState(null)
  // Message shown on the "checking access" screen; updated during auto-retries.
  const [checkingMsg, setCheckingMsg] = React.useState('Checking access…')

  const recheckAccess = React.useCallback(async () => {
    if (!authClient) return
    setCheckingMsg('Checking access…')
    setAccess(null) // show the checking screen while we (re)verify
    try {
      // myAccess only THROWS on infrastructure errors (a genuine "not allowed" comes
      // back as allowed:false in the record), so any throw is a transient network/replica
      // issue - retry with backoff before surfacing an error to the user.
      const { result } = await withRetry(
        () => getMyAccess(authClient),
        'myAccess',
        (attempt) =>
          setCheckingMsg(`Connection hiccup — retrying (attempt ${attempt})…`)
      )
      setAccess(result)
    } catch (e) {
      console.error('icgpt_admin myAccess failed after retries', e)
      // Fail closed with a connection-error screen (its Retry re-runs this), never
      // silently open.
      setAccess({
        allowed: false,
        isAdmin: false,
        earlyAccess: true,
        whitelisted: false,
        requested: false,
        error: true,
      })
    }
  }, [authClient])

  React.useEffect(() => {
    if (!authClient) {
      setAccess(null)
      return
    }
    recheckAccess()
  }, [authClient, recheckAccess])

  const doLogout = React.useCallback(async () => {
    try {
      if (authClient) await authClient.logout()
    } catch (e) {
      /* ignore */
    }
    setAuthClient(undefined)
    setAccess(null)
  }, [authClient])

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

  // System prompt test bed: Default + 3 editable custom slots, persisted per
  // browser in localStorage. The active prompt's text feeds the first turn of a
  // conversation (see llamacpp.js buildInstructTurnPrompt).
  const [customPrompts, setCustomPrompts] = React.useState(loadCustomPrompts())
  const [activeSystemPromptId, setActiveSystemPromptId] = React.useState(
    loadActiveId()
  )
  React.useEffect(() => saveCustomPrompts(customPrompts), [customPrompts])
  React.useEffect(
    () => saveActiveId(activeSystemPromptId),
    [activeSystemPromptId]
  )
  const activeSystemPromptText = getPromptById(
    customPrompts,
    activeSystemPromptId
  ).text

  // Inference parameters (sampling knobs) tuned in the Parameters panel. A global
  // workbench: persisted per browser, applied to every generation until reset.
  const [params, setParams] = React.useState(loadParams())
  React.useEffect(() => saveParams(params), [params])

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
  // (prompt) tokens, tokensOut = generated tokens, cyclesCost = EXACT cycles the LLM
  // spent (measured on-chain by the controller), genNs = cumulative on-chain
  // generation time in ns. tokens/sec = tokensOut / (genNs/1e9).
  const [stats, setStats] = React.useState({
    updateCalls: 0,
    tokensIn: 0,
    tokensOut: 0,
    cyclesCost: 0,
    genNs: 0,
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

  // Signed in, but still checking early-access status.
  if (access === null) {
    return (
      <div>
        <Head />
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6272a4',
            fontFamily: 'monospace',
          }}
        >
          {checkingMsg}
        </div>
        <Footer />
      </div>
    )
  }

  // Signed in but not allowed during early access → request-access lock screen.
  if (!access.allowed) {
    return (
      <div>
        <Head />
        <EarlyAccessLockScreen
          authClient={authClient}
          access={access}
          onLogout={doLogout}
          onRetry={recheckAccess}
        />
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
          access,
          recheckAccess,
          doLogout,
          actorRef,
          setActorRef,
          chatNew,
          setChatNew,
          chatDone,
          setChatDone,
          selectedModelId,
          setSelectedModelId,
          customPrompts,
          setCustomPrompts,
          activeSystemPromptId,
          setActiveSystemPromptId,
          activeSystemPromptText,
          params,
          setParams,
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
      <Footer fixed />
    </div>
  )
}
