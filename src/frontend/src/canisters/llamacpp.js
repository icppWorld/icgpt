// Functions to interact with the llama2_cpp_canister

const IC_HOST_URL = process.env.IC_HOST_URL

const displayQueue = []
let isDisplaying = false
let chatStarted = false
let chatFinished = false

// The KV cache quantization the model was loaded with (`load_model`).
// It must be passed to new_chat & run_update as well, so the prompt cache of a
// session matches the model. See llama_cpp_canister README, Appendix A: this is
// the configuration the 25-tokens-per-update-call figure was measured on.
const CACHE_TYPE_K = 'q8_0'

// Sampling settings recommended on the Qwen2.5 model card
const TEMP = '0.6'
const REPEAT_PENALTY = '1.1'

function buildNewChatInput() {
  // TODO: prompt.cache as a variable to save/delete chats
  // '(record { args = vec {"--prompt-cache"; "my_cache/prompt.cache"} })'
  return {
    args: [
      '--prompt-cache',
      'my_cache/prompt.cache',
      '--cache-type-k',
      CACHE_TYPE_K,
    ],
  }
}

// The part of the prompt that the LLM has not ingested yet.
// Before the first run_update call, that is the whole input string.
function promptRemainingOf(inputString, responseUpdate) {
  if (responseUpdate && 'Ok' in responseUpdate) {
    return responseUpdate.Ok.prompt_remaining
  }
  return inputString
}

// True once the whole prompt is ingested and the LLM is generating new tokens.
function isGenerating(inputString, responseUpdate) {
  return promptRemainingOf(inputString, responseUpdate) === ''
}

function buildRunUpdateInput(
  inputString,
  responseUpdate,
  setWaitAnimationMessage,
  modelType,
  finetuneType
) {
  const promptRemaining = promptRemainingOf(inputString, responseUpdate)
  let output = ''
  if (responseUpdate && 'Ok' in responseUpdate) {
    output = responseUpdate.Ok.output
  }
  console.log('buildRunUpdateInput - responseUpdate = ', responseUpdate)
  console.log('buildRunUpdateInput - inputString = ', inputString)
  console.log('buildRunUpdateInput - promptRemaining = ', promptRemaining)
  console.log('buildRunUpdateInput - output = ', output)
  let systemPrompt
  let userPrompt
  let fullPrompt
  if (promptRemaining === '') {
    if (responseUpdate) {
      setWaitAnimationMessage('Calling LLM canister - Generating tokens')
    }
    console.log('buildRunUpdateInput - promptRemaining is now empty')
    fullPrompt = ''
  } else {
    // We're still feeding the original prompt
    if (modelType === 'Qwen2.5' && finetuneType === 'Instruct') {
      systemPrompt =
        '<|im_start|>system\nYou are a helpful assistant.<|im_end|>\n'
      // systemPrompt = '<|im_start|>system<|im_end|>\n'
      userPrompt = '<|im_start|>user\n' + inputString + '<|im_end|>\n'
      fullPrompt = systemPrompt + userPrompt + '<|im_start|>assistant\n'
    } else {
      console.log('buildRunUpdateInput - UNKNOWN modelType & finetuneType')
    }
  }
  // While still ingesting the prompt, use '1' so the LLM does not generate new
  // tokens yet. Once the prompt is fully ingested (fullPrompt is empty), use
  // '512' to let it generate until it reaches end-of-generation.
  // Either way, the canister caps it at the max_tokens_update it was set to.
  const numtokens = fullPrompt === '' ? '512' : '1'
  return {
    args: [
      '--prompt-cache',
      'my_cache/prompt.cache',
      '--prompt-cache-all',
      '--cache-type-k',
      CACHE_TYPE_K,
      '--temp',
      TEMP,
      '--repeat-penalty',
      REPEAT_PENALTY,
      '-sp',
      '-p',
      fullPrompt,
      '-n',
      numtokens,
    ],
  }
}

const DEBUG = true

// -----------------------------------------------------------------------------
// Adaptive pacing of the typewriter effect.
//
// Each run_update call returns a bunch of tokens at once (25 for the Qwen2.5
// 0.5b q8_0 canister, since llama_cpp_canister v0.12.0). We paint those words
// one by one, but the delay per word must not be hardcoded: if the words of a
// bunch take longer to paint than the next run_update call takes to return, the
// displayQueue grows without bound and the text falls further behind the LLM
// with every bunch.
//
// So we measure how long the previous run_update call actually took and spread
// the words of a bunch over that same duration, divided by the queue backlog.
// The deeper the backlog, the faster we paint, so the display always catches up.
const MIN_WORD_DELAY_MS = 25
const MAX_WORD_DELAY_MS = 250
const DEFAULT_CALL_DURATION_MS = 3000
let lastCallDurationMs = DEFAULT_CALL_DURATION_MS

// The time budget to paint one bunch of words, and the delay per word in it
function wordDelayMs(numWords) {
  if (numWords <= 0) return MIN_WORD_DELAY_MS
  const budgetMs = lastCallDurationMs / (displayQueue.length + 1)
  return Math.min(
    MAX_WORD_DELAY_MS,
    Math.max(MIN_WORD_DELAY_MS, budgetMs / numWords)
  )
}

async function waitForQueueToEmpty() {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js waitForQueueToEmpty ')
  }
  while (displayQueue.length > 0) {
    await sleep(100)
  }
}

async function fetchInference(
  actor,
  setChatOutputText,
  chatNew,
  setChatNew,
  chatDone,
  setChatDone,
  setChatDisplay,
  setWaitAnimationMessage,
  inputString,
  setInputString,
  inputPlaceholder,
  setInputPlaceholder,
  numStepsFetchInference,
  modelType,
  finetuneType
) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js fetchInference ')
  }

  displayQueue.length = 0 // Reset the displayQueue
  lastCallDurationMs = DEFAULT_CALL_DURATION_MS // Reset the pacing budget
  setChatOutputText('') // Reset the output text box

  // Start the display loop in the background
  processDisplayQueue(
    chatDone,
    setChatDisplay,
    setWaitAnimationMessage,
    setChatOutputText,
    setInputString,
    setInputPlaceholder
  )

  let count = 0
  let responseUpdate = null
  setWaitAnimationMessage('Calling LLM canister - Ingesting the prompt tokens')
  for (let i = 0; i < numStepsFetchInference; i++) {
    count++

    if (i === 0 && chatNew) {
      try {
        const newChatInput = buildNewChatInput()
        console.log('Calling new_chat with input: ', newChatInput)
        const responseNewChat = await actor.new_chat(newChatInput)
        if ('Ok' in responseNewChat) {
          console.log(
            'Call to new_chat successful with responseNewChat: ',
            responseNewChat
          )

          // This is a little hacky, but works like a charm
          if (finetuneType === 'Raw LLM') {
            if (DEBUG) {
              console.log(
                'DEBUG-FLOW: llamacpp.js adding inputString to processQueue'
              )
            }
            responseNewChat.Ok.output = inputString
            // Push the output to the queue and the display loop will pick it up
            displayQueue.push(responseNewChat)
          }
        } else {
          console.log(
            'Call to new_chat failed with responseNewChat: ',
            responseNewChat
          )
          let ermsg = ''
          if ('Err' in responseNewChat && 'Other' in responseNewChat.Err)
            ermsg = responseNewChat.Err.Other
          throw new Error(`Call to new_chat failed: ` + ermsg)
        }
      } catch (error) {
        // caught by caller and printed to console there
        throw new Error(`Error: ${error.message}`)
      }
    } else {
      try {
        // Determine the phase BEFORE the call, based on the previous response
        const generating = isGenerating(inputString, responseUpdate)
        const runUpdateInput = buildRunUpdateInput(
          inputString,
          responseUpdate,
          setWaitAnimationMessage,
          modelType,
          finetuneType
        )
        console.log('Calling run_update with input: ', runUpdateInput)
        const startMs = performance.now()
        responseUpdate = await actor.run_update(runUpdateInput)
        lastCallDurationMs = performance.now() - startMs
        console.log('run_update took (ms): ', lastCallDurationMs)
        if ('Ok' in responseUpdate) {
          console.log(
            'Call to run_update successful, with responseUpdate: ',
            responseUpdate
          )

          // if (i === 1) {
          //   setChatOutputText('')
          //   setInputPlaceholder('The LLM is generating text...')
          // }
          // Only display the output of the generating phase.
          // The ingesting calls return an empty output, except for the last
          // one, which returns the 1 token that "-n 1" made it generate. That
          // token is NOT carried over into the next call: the generating phase
          // restarts at the end of the prompt and emits it again. Displaying it
          // here would print it twice (eg. "LL" + "LLMs, ..." -> "LLLLMs, ...")
          if (generating) {
            // Push the output to the queue, the display loop will pick it up
            displayQueue.push(responseUpdate)
          }
          // We reached end of story if the LLM says so
          if (responseUpdate.Ok.generated_eog) {
            // Reset the inputString and provide a new placeHolder
            setInputString('')
            console.log('-A- setChatDone(true)')
            setChatDone(true)
            chatStarted = false
            chatFinished = true
            setInputPlaceholder('The end!')
            break
          }
        } else {
          console.log(
            'Call to run_update failed, with responseUpdate: ',
            responseUpdate
          )
          let ermsg = ''
          if ('Err' in responseUpdate) ermsg = responseUpdate.Err.error
          throw new Error(`Call to run_update failed: ` + ermsg)
        }
      } catch (error) {
        // caught by caller and printed to console there
        throw new Error(`Error: ${error.message}`)
      }
    }
  }
  if (count >= numStepsFetchInference) {
    setInputString('')
    setChatDone(true)
    chatStarted = false
    chatFinished = true
    setInputPlaceholder('Message ICGPT')
  }
}

async function processDisplayQueue(
  chatDone,
  setChatDisplay,
  setWaitAnimationMessage,
  setChatOutputText,
  setInputString,
  setInputPlaceholder
) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js processDisplayQueue ')
    console.log('- displayQueue.length = ', displayQueue.length)
    console.log('- isDisplaying        = ', isDisplaying)
  }

  let loopCounter = 0
  while (true) {
    loopCounter++
    if (DEBUG) {
      console.log(
        'DEBUG-FLOW: entered llamacpp.js processDisplayQueue is still looping'
      )
      console.log('- loopCounter         = ', loopCounter)
      console.log('- displayQueue.length = ', displayQueue.length)
      console.log('- isDisplaying        = ', isDisplaying)
      console.log('- chatStarted         = ', chatStarted)
      console.log('- chatFinished        = ', chatFinished)
    }
    if (chatStarted && chatFinished) {
      break
    }
    if (displayQueue.length > 0 && !isDisplaying) {
      if (DEBUG) {
        console.log('DEBUG-FLOW: llamacpp.js processDisplayQueue - A')
      }
      isDisplaying = true
      const response = displayQueue.shift()
      await displayResponse(
        response,
        setChatDisplay,
        setWaitAnimationMessage,
        setChatOutputText,
        setInputString,
        setInputPlaceholder
      )
      isDisplaying = false
      if (!chatFinished) {
        setChatDisplay('WaitAnimation')
      }
    } else {
      if (DEBUG) {
        console.log('DEBUG-FLOW: llamacpp.js processDisplayQueue - B')
      }
      if (chatStarted && !chatFinished) {
        if (DEBUG) {
          console.log('DEBUG-FLOW: llamacpp.js processDisplayQueue - C')
        }
        setChatDisplay('WaitAnimation')
      }
      await sleep(1000)
    }
  }
}

function displayResponse(
  response,
  setChatDisplay,
  setWaitAnimationMessage,
  setChatOutputText,
  setInputString,
  setInputPlaceholder
) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js displayResponse ')
  }
  // force a re-render showing the ChatOutput
  setChatDisplay('ChatOutput')

  console.log('response to display:', response)
  console.log('- response.Ok.output =', response.Ok.output)

  const responseString = response.Ok.output

  if (typeof responseString !== 'string') {
    console.error('Received unexpected response format:', response)
    return Promise.reject(new Error('Unexpected response format'))
  }

  const words = responseString.split(' ')
  const delayMs = wordDelayMs(words.length)
  if (DEBUG) {
    console.log('- displayQueue.length = ', displayQueue.length)
    console.log('- words.length        = ', words.length)
    console.log('- delayMs per word    = ', delayMs)
  }

  // Use reduce to chain promises sequentially
  return words.reduce((acc, word, j) => {
    return acc.then(() => {
      const prependSpace = j !== 0
      return delayAndAppend(setChatOutputText, word, prependSpace, delayMs)
    })
  }, Promise.resolve())
}

function sleep(ms) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js sleep ')
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Function to add a delay and then update the chat output.
async function delayAndAppend(setChatOutputText, word, prependSpace, delayMs) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js delayAndAppend ')
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      // Append word to the current chat output
      const textToAppend = prependSpace ? ' ' + word : word
      setChatOutputText((prevText) => prevText + textToAppend)
      resolve() // Signal that the promise is done
    }, delayMs) // ms delay between each word, see wordDelayMs
  })
}

// Called when user clicks 'submit' button
export async function doSubmitLlamacpp({
  authClient,
  actorRef,
  chatNew,
  chatDone,
  setActorRef,
  setChatNew,
  setChatDone,
  inputString,
  setInputString,
  inputPlaceholder,
  isSubmitting,
  setIsSubmitting,
  setInputPlaceholder,
  setChatOutputText,
  setChatDisplay,
  setWaitAnimationMessage,
  modelType,
  modelSize,
  finetuneType,
}) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js doSubmitLlamacpp ')
    console.log('- modelType ', modelType)
    console.log('- modelSize ', modelSize)
    console.log('- finetuneType ', finetuneType)
  }
  setIsSubmitting(true)

  // Based on the values of modelType, modelSize, and finetuneType, determine the module to import
  let moduleToImport
  const numStepsFetchInference = 1000 // Basically, just keep going...
  if (modelType === 'Qwen2.5' && finetuneType === 'Instruct') {
    switch (modelSize) {
      case '0.5b_q8_0':
        console.log('canister - Qwen2.5, 0.5b_q8_0, Instruct')
        moduleToImport = import('DeclarationsCanisterLlamacpp_Qwen25_05B_Q8')
        break
    }
  } else {
    console.log('canister - Qwen2.5, 0.5b_q8_0, Instruct')
    moduleToImport = import('DeclarationsCanisterLlamacpp_Qwen25_05B_Q8')
  }
  const { canisterId, createActor } = await moduleToImport

  console.log('chatNew : ', chatNew)
  console.log('chatDone : ', chatDone)
  console.log('chatFinished : ', chatFinished)
  let actor_ = actorRef.current
  if (chatNew) {
    console.log('Creating identity ')
    const identity = await authClient.getIdentity()
    console.log('Creating actor ')
    actor_ = createActor(canisterId, {
      agentOptions: {
        identity,
        host: IC_HOST_URL,
      },
    })
    setActorRef(actor_)
  }

  try {
    // Call llm canister to check on health
    // Force a re-render, showing the WaitAnimation
    setChatDisplay('WaitAnimation')
    console.log('Calling actor_.health ')
    const responseHealth = await actor_.health()
    console.log('llm canister health: ', responseHealth)

    if ('Ok' in responseHealth) {
      console.log('llm canister is healthy: ', responseHealth)

      // setWaitAnimationMessage('Checking readiness of LLM canister')
      // console.log('Calling actor_.ready ')
      // const responseReady = await actor_.ready()
      // console.log('llm canister ready: ', responseReady)
      // setWaitAnimationMessage('Calling LLM canister') // Reset it to default

      // if ('Ok' in responseReady) {
      // Ok, ready for show time...
      setWaitAnimationMessage('Calling LLM canister - generating tokens')
      await fetchInference(
        actor_,
        setChatOutputText,
        chatNew,
        setChatNew,
        chatDone,
        setChatDone,
        setChatDisplay,
        setWaitAnimationMessage,
        inputString,
        setInputString,
        inputPlaceholder,
        setInputPlaceholder,
        numStepsFetchInference,
        modelType,
        finetuneType
      )
      setWaitAnimationMessage('Calling LLM canister') // Reset it to default

      await waitForQueueToEmpty()
      // } else {
      //   let ermsg = ''
      //   if ('Err' in responseReady && 'Other' in responseReady.Err)
      //     ermsg = responseReady.Err.Other
      //   throw new Error(`LLM canister is not ready: ` + ermsg)
      // }
    } else {
      setWaitAnimationMessage('Calling LLM canister') // Reset it to default
      let ermsg = ''
      if ('Err' in responseHealth && 'Other' in responseHealth.Err)
        ermsg = responseHealth.Err.Other
      throw new Error(`LLM canister is not healthy: ` + ermsg)
    }
  } catch (error) {
    setWaitAnimationMessage('Calling LLM canister') // Reset it to default
    console.error(error)
    setChatDone(true)
    chatFinished = true
    // Force a re-render, showing the ChatOutput
    setChatDisplay('CanisterError')
  } finally {
    setWaitAnimationMessage('Calling LLM canister') // Reset it to default
    setIsSubmitting(false)
  }
}

// Called when user clicks '+ New chat' button
export async function doNewChatLlamacpp({
  authClient,
  actorRef,
  chatNew,
  chatDone,
  setActorRef,
  setChatNew,
  setChatDone,
  inputString,
  setInputString,
  inputPlaceholder,
  isSubmitting,
  setIsSubmitting,
  setInputPlaceholder,
  setChatOutputText,
  setChatDisplay,
  setWaitAnimationMessage,
}) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js doNewChatLlamacpp ')
  }
  setChatNew(true)
  setChatDone(false)
  chatFinished = false
  setChatOutputText('')
  setChatDisplay('SelectModel')
}

// Conversion function with extraction logic
const convertChatsToChatData = (chats) => {
  return chats.map((chat, index) => {
    // Extract systemPrompt, inputString, and outputString using regex
    const systemPromptMatch = chat.chat.match(
      /<\|im_start\|>system\n(.*?)<\|im_end\|>/s
    )
    const inputStringMatch = chat.chat.match(
      /<\|im_start\|>user\n(.*?)<\|im_end\|>/s
    )
    let outputStringMatch = chat.chat.match(
      /<\|im_start\|>assistant\n(.*?)<\|im_end\|>/s
    )

    const systemPrompt = systemPromptMatch ? systemPromptMatch[1] : ''
    const inputString = inputStringMatch ? inputStringMatch[1] : ''
    let outputString = outputStringMatch ? outputStringMatch[1] : ''

    // If outputString is still empty, perhaps the chat is not finished. Get whatever there is.
    if (!outputString) {
      outputStringMatch = outputStringMatch = chat.chat.match(
        /<\|im_start\|>assistant\n(.*?)(<\|im_end\|>|$)/s
      )
      outputString = outputStringMatch ? outputStringMatch[1] : ''
    }

    // Generate label: chat.timestamp + first N words of inputString
    const inputWords = inputString.split(' ').slice(0, 25).join(' ')
    const dateLabel = chat.timestamp.split('_')[0]
    const label = `(${dateLabel}) ${inputWords}`

    return {
      label: label,
      systemPrompt: systemPrompt,
      inputString: inputString,
      outputString: outputString,
    }
  })
}

// Called when user clicks 'Chats' button and ChatsPopupModal is (re)mounted
// Returns a JSON object with the chatData
export async function getChatsLlamacpp({
  authClient,
  actorRef,
  chatNew,
  chatDone,
  setActorRef,
  setChatNew,
  setChatDone,
  inputString,
  setInputString,
  inputPlaceholder,
  isSubmitting,
  setIsSubmitting,
  setInputPlaceholder,
  setChatOutputText,
  setChatDisplay,
  setWaitAnimationMessage,
  modelType,
  modelSize,
  finetuneType,
  chats,
  setChats,
}) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js getChatsLlamacpp ')
    console.log('- modelType ', modelType)
    console.log('- modelSize ', modelSize)
    console.log('- finetuneType ', finetuneType)
  }

  // Based on the values of modelType, modelSize, and finetuneType, determine the module to import
  let moduleToImport
  if (modelType === 'Qwen2.5' && finetuneType === 'Instruct') {
    switch (modelSize) {
      case '0.5b_q8_0':
        console.log('canister - Qwen2.5, 0.5b_q8_0, Instruct')
        moduleToImport = import('DeclarationsCanisterLlamacpp_Qwen25_05B_Q8')
        break
    }
  } else {
    console.log('canister - Qwen2.5, 0.5b_q8_0, Instruct')
    moduleToImport = import('DeclarationsCanisterLlamacpp_Qwen25_05B_Q8')
  }
  const { canisterId, createActor } = await moduleToImport

  // let actor_ = actorRef.current
  // if (chatNew) {
  console.log('Creating identity ')
  const identity = await authClient.getIdentity()
  console.log('Creating actor ')
  const actor_ = createActor(canisterId, {
    agentOptions: {
      identity,
      host: IC_HOST_URL,
    },
  })
  setActorRef(actor_)
  // }

  try {
    // Call llm canister to check on health
    // Force a re-render, showing the WaitAnimation
    setWaitAnimationMessage('Calling LLM canister - get_chats')
    setChatDisplay('WaitAnimation')
    console.log('Calling actor_.health ')
    const responseHealth = await actor_.health()
    console.log('llm canister health: ', responseHealth)

    if ('Ok' in responseHealth) {
      console.log('llm canister is healthy: ', responseHealth)

      // Ok, ready for show time...
      setWaitAnimationMessage('Calling LLM canister - get_chats')
      const responseGetChats = await actor_.get_chats()
      if ('Ok' in responseGetChats) {
        const chatData = convertChatsToChatData(responseGetChats.Ok.chats)
        setWaitAnimationMessage('Calling LLM canister') // Reset it to default
        setChatDisplay('ChatOutput')
        setChats(chatData)
      } else {
        setWaitAnimationMessage('Calling LLM canister') // Reset it to default
        let ermsg = ''
        if ('Err' in responseGetChats && 'Other' in responseGetChats.Err)
          ermsg = responseGetChats.Err.Other
        throw new Error(`Call to getChats returns error: ` + ermsg)
      }
    } else {
      setWaitAnimationMessage('Calling LLM canister') // Reset it to default
      let ermsg = ''
      if ('Err' in responseHealth && 'Other' in responseHealth.Err)
        ermsg = responseHealth.Err.Other
      throw new Error(`LLM canister is not healthy: ` + ermsg)
    }
  } catch (error) {
    setWaitAnimationMessage('Calling LLM canister') // Reset it to default
    console.error(error)
    // Force a re-render, showing the ChatOutput
    setChatDisplay('CanisterError')
  } finally {
    setWaitAnimationMessage('Calling LLM canister') // Reset it to default
    setChatDisplay('ChatOutput')
  }
  setChatDisplay('ChatOutput')
}
