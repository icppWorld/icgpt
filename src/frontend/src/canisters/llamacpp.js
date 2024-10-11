// Functions to interact with the llama2_cpp_canister

const IC_HOST_URL = process.env.IC_HOST_URL

const displayQueue = []
let isDisplaying = false
let chatStarted = false
let chatFinished = false

function buildNewChatInput() {
  // TODO: prompt.cache as a variable to save/delete chats
  // '(record { args = vec {"--prompt-cache"; "my_cache/prompt.cache"} })'
  return {
    args: ['--prompt-cache', 'my_cache/prompt.cache'],
  }
}

function buildRunUpdateInput(
  inputString,
  responseUpdate,
  setWaitAnimationMessage,
  modelType,
  finetuneType
) {
  let promptRemaining = inputString
  let output = ''
  if (responseUpdate && 'Ok' in responseUpdate) {
    promptRemaining = responseUpdate.Ok.prompt_remaining
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
      userPrompt = '<|im_start|>user\n' + inputString + '<|im_end|>\n'
      fullPrompt = systemPrompt + userPrompt + '<|im_start|>assistant\n'
    } else if (
      modelType === 'llama.cpp Charles' &&
      finetuneType === 'Raw LLM'
    ) {
      systemPrompt = ''
      userPrompt = inputString
      fullPrompt = systemPrompt + userPrompt
    } else {
      console.log('buildRunUpdateInput - UNKNOWN modeType & finetuneType')
    }
  }

  const numtokens = '512'
  return {
    args: [
      '--model',
      'model.gguf',
      '--prompt-cache',
      'my_cache/prompt.cache',
      '--prompt-cache-all',
      '-sp',
      '-p',
      fullPrompt,
      '-n',
      numtokens,
      '--print-token-count', // TODO: outcomment
      '1',
    ],
  }
  // TODO: REMOVE
  // return {
  //   args: modelArgs.concat([
  //     '--prompt-cache',
  //     'my_cache/prompt.cache',
  //     '--prompt-cache-all',
  //     '-sp',
  //     '-p',
  //     fullPrompt,
  //     '-n',
  //     numtokens,
  //   ])
  // }
}

const DEBUG = true

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
        const runUpdateInput = buildRunUpdateInput(
          inputString,
          responseUpdate,
          setWaitAnimationMessage,
          modelType,
          finetuneType
        )
        console.log('Calling run_update with input: ', runUpdateInput)
        responseUpdate = await actor.run_update(runUpdateInput)
        if ('Ok' in responseUpdate) {
          console.log(
            'Call to run_update successful, with responseUpdate: ',
            responseUpdate
          )

          // if (i === 1) {
          //   setChatOutputText('')
          //   setInputPlaceholder('The LLM is generating text...')
          // }
          // Push the output to the queue and the display loop will pick it up
          displayQueue.push(responseUpdate)
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

  let loopCounter=0
  while (true) {
    loopCounter++
    if (DEBUG) {
      console.log('DEBUG-FLOW: entered llamacpp.js processDisplayQueue is still looping')
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

  // Use reduce to chain promises sequentially
  return words.reduce((acc, word, j) => {
    return acc.then(() => {
      const prependSpace = j !== 0
      return delayAndAppend(setChatOutputText, word, prependSpace)
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
async function delayAndAppend(setChatOutputText, word, prependSpace) {
  if (DEBUG) {
    console.log('DEBUG-FLOW: entered llamacpp.js delayAndAppend ')
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      // Append word to the current chat output
      const textToAppend = prependSpace ? ' ' + word : word
      setChatOutputText((prevText) => prevText + textToAppend)
      resolve() // Signal that the promise is done
    }, 250) // ms delay between each word
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
    console.log('- modelTfinetuneTypepe ', finetuneType)
  }
  setIsSubmitting(true)

  // Based on the values of modelType, modelSize, and finetuneType, determine the module to import
  let moduleToImport
  const numStepsFetchInference = 1000 // Basically, just keep going...
  if (modelType === 'Qwen2.5' && finetuneType === 'Instruct') {
    switch (modelSize) {
      case '0.5b_q4_k_m':
        console.log('canister - Qwen2.5, 0.5b_q4_k_m, Instruct')
        moduleToImport = import(
          'DeclarationsCanisterLlamacpp_Qwen25_05B_Q4_k_m'
        )
        break
      case '0.5b_q8_0':
        console.log('canister - Qwen2.5, 0.5b_q8_0, Instruct')
        moduleToImport = import('DeclarationsCanisterLlamacpp_Qwen25_05B_Q8')
        break
    }
  } else if (modelType === 'llama.cpp Charles' && finetuneType === 'Raw LLM') {
    switch (modelSize) {
      case '42M':
        console.log('canister - llama cpp Charles 42M, Raw LLM')
        moduleToImport = import('DeclarationsCanisterLlamacpp_Charles_42m')
        break
    }
  } else {
    console.log('canister - Qwen2.5, 0.5b_q4_k_m, Instruct')
    moduleToImport = import('DeclarationsCanisterLlamacpp_Qwen25_05B_Q4_k_m')
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
