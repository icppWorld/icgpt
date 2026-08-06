// eslint-disable-next-line no-use-before-define
import React from 'react'
import { Head } from './common/Head'
import { Footer } from './common/Footer'
import { StagingBanner } from './common/StagingBanner'
import { Outlet, useLocation } from 'react-router-dom'
import { Login } from './routes/Login'
import { EarlyAccessLockScreen } from './routes/EarlyAccessLockScreen'
import { TopNav, TOPNAV_HEIGHT } from './common/TopNav'
import { AdminPanel } from './routes/AdminPanel'
import { getMyAccess, logClientEvent } from './canisters/admin'
import { withRetry } from './canisters/retry'
import { runExperiment } from './lab/labEngine'
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

  // The /canisters status page is viewable by ANY signed-in user (not just early-access),
  // so we skip the early-access gate for it (it shows only public cycle balances).
  const location = useLocation()

  // Admin panel modal, opened from the shared TopNav (any signed-in admin, any page).
  const [showAdminPanel, setShowAdminPanel] = React.useState(false)

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

  // ---------------------------------------------------------
  // Prompt Cost Lab run state — hoisted here (not in PromptCostLab) so a running
  // experiment SURVIVES navigating between the Lab, Chat and Canisters routes. Those
  // are child routes of <App>, so <App> stays mounted while its <Outlet> swaps;
  // keeping the run + its report/history here means leaving the Lab page no longer
  // unmounts (and orphans) the in-flight runExperiment. Exposed to the Lab via the
  // Outlet context as `labRun`, and to the TopNav as a live "running" indicator.
  const [labRunning, setLabRunning] = React.useState(false)
  const [labProgress, setLabProgress] = React.useState(null)
  const [labReport, setLabReport] = React.useState(null)
  const [labRuns, setLabRuns] = React.useState([])
  const [labError, setLabError] = React.useState(null)
  // A stable {aborted} holder the Cancel button mutates mid-run (same non-rerender
  // ref convention as actorRef above); replaced fresh on each start.
  const labCancelRef = React.useRef({ aborted: false })

  // Start an experiment. The Lab passes a snapshot of its editor state
  // ({template, model, params, kSamples}); authClient is taken from here. Body
  // mirrors the old in-component run(): reset, run, store the report + append to
  // history, log a failure that survived retries, and always clear the running flag.
  const startLabRun = React.useCallback(
    async ({ template, model, params: runParams, kSamples }) => {
      setLabError(null)
      setLabReport(null)
      setLabRunning(true)
      setLabProgress({ done: 0, total: 0, label: 'Starting…' })
      labCancelRef.current = { aborted: false }
      try {
        const rep = await runExperiment({
          authClient,
          template,
          model,
          params: runParams,
          kSamples: Number(kSamples) || 1,
          onProgress: setLabProgress,
          signal: labCancelRef.current,
        })
        setLabReport(rep)
        setLabRuns((rs) => [...rs, rep])
      } catch (e) {
        const msg = e && e.message ? e.message : String(e)
        setLabError(msg)
        // Best-effort: record a Lab failure (that survived retries) to the on-chain
        // monitoring log. Skip user-initiated cancels. Fire-and-forget.
        if (!labCancelRef.current.aborted) {
          logClientEvent(
            authClient,
            'lab_inference_failed',
            `${model.gguf}: ${msg}`
          ).catch(() => {})
        }
      } finally {
        setLabRunning(false)
        setLabProgress(null)
      }
    },
    [authClient]
  )
  const cancelLabRun = () => {
    labCancelRef.current.aborted = true
  }
  const clearLabRuns = () => setLabRuns([])
  // Grouped API handed to the Lab (via Outlet context) and the TopNav indicator.
  const labRun = {
    running: labRunning,
    progress: labProgress,
    report: labReport,
    runs: labRuns,
    error: labError,
    start: startLabRun,
    cancel: cancelLabRun,
    clearRuns: clearLabRuns,
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

  // /canisters bypasses the early-access checks below (any signed-in user may view it).
  const openWhenSignedIn = location.pathname === '/canisters'

  // Signed in, but still checking early-access status.
  if (!openWhenSignedIn && access === null) {
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
  if (!openWhenSignedIn && !access.allowed) {
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
      <TopNav
        access={access}
        labRun={labRun}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onLogout={doLogout}
      />
      <div style={{ paddingTop: `${TOPNAV_HEIGHT}px` }}>
        <Outlet
          context={{
            authClient,
            setAuthClient,
            access,
            recheckAccess,
            doLogout,
            actorRef,
            setActorRef,
            labRun,
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
      </div>
      {showAdminPanel ? (
        <AdminPanel
          authClient={authClient}
          initialEarlyAccess={access?.earlyAccess}
          onClose={() => setShowAdminPanel(false)}
        />
      ) : null}
      {/* <StagingBanner /> */}
      <Footer fixed />
    </div>
  )
}
