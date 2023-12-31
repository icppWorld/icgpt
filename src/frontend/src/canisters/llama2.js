// Functions to interact with the icpp_llama2 canister

const IC_HOST_URL = process.env.IC_HOST_URL

const displayQueue = []
let isDisplaying = false

async function waitForQueueToEmpty() {
  while (displayQueue.length > 0) {
    await sleep(100)
  }
}

async function fetchInference(
  actor,
  setChatOutputText,
  chatNew,
  setChatNew,
  setChatDisplay,
  inputString,
  setInputString,
  inputPlaceholder,
  setInputPlaceholder,
  numStepsFetchInference
) {
  const params = {
    prompt: '',
    steps: 10,
    temperature: 0.0,
    topp: 0.9,
    rng_seed: 0,
  }

  // Helper function to split the inputString into chunks of 10 words
  const splitIntoChunks = (str) => {
    const words = str.split(/\s+/)
    const chunks = []
    for (let i = 0; i < words.length; i += 10) {
      chunks.push(words.slice(i, i + 10).join(' '))
    }
    return chunks
  }

  // Chunk the inputString and save for processing
  const inputChunks = splitIntoChunks(inputString)
  let currentChunkIndex = 0

  // Start the display loop in the background
  processDisplayQueue(
    setChatDisplay,
    setChatOutputText,
    setInputString,
    setInputPlaceholder
  )

  for (let i = 0; i < numStepsFetchInference; i++) {
    let response

    // Update the params.prompt to the next chunk of inputString
    if (currentChunkIndex < inputChunks.length) {
      params.prompt = inputChunks[currentChunkIndex]
      currentChunkIndex++
    } else {
      params.prompt = '' // Reset to empty if no chunks left
    }

    if (i === 0 && chatNew) {
      console.log('Calling actor_.new_chat ')
      const responseNewChat = await actor.new_chat()
      console.log('llama2 canister new_chat: ', responseNewChat)
      console.log(
        'Calling inference for next tokens with prompt: ',
        params.prompt
      )
      response = await actor.inference(params)

      // Now we can force a re-render and switch to an empty output
      setChatNew(false)
      setChatOutputText('')
    } else {
      console.log(
        'Calling inference for next tokens with prompt: ',
        params.prompt
      )
      response = await actor.inference(params)
    }

    // Push the response to the queue and the display loop will pick it up
    displayQueue.push(response)

    // Check if the response is an empty string. If it is, break out of the loop.
    if (response.ok === '') {
      break
    }
  }
}

async function processDisplayQueue(
  setChatDisplay,
  setChatOutputText,
  setInputString,
  setInputPlaceholder
) {
  while (true) {
    if (displayQueue.length > 0 && !isDisplaying) {
      isDisplaying = true
      const response = displayQueue.shift()
      await displayResponse(
        response,
        setChatDisplay,
        setChatOutputText,
        setInputString,
        setInputPlaceholder
      )
      isDisplaying = false
    } else {
      await sleep(100)
    }
  }
}

function displayResponse(
  response,
  setChatDisplay,
  setChatOutputText,
  setInputString,
  setInputPlaceholder
) {
  // force a re-render showing the ChatOutput
  setChatDisplay('ChatOutput')

  console.log('response from inference:', response)

  const responseString = response.ok // Extract the responseString from the "ok" key

  if (typeof responseString !== 'string') {
    console.error('Received unexpected response format:', response)
    return Promise.reject(new Error('Unexpected response format'))
  }

  // Reset the inputString and provide a new placeHolder
  setInputString('')
  if (responseString === '') {
    setInputPlaceholder('The end!')
  } else {
    setInputPlaceholder('Continue the story...')
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
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Function to add a delay and then update the chat output.
async function delayAndAppend(setChatOutputText, word, prependSpace) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Append word to the current chat output
      const textToAppend = prependSpace ? ' ' + word : word
      setChatOutputText((prevText) => prevText + textToAppend)
      resolve() // Signal that the promise is done
    }, 500) // ms delay between each word
  })
}

// Called when user clicks 'submit' button
export async function doSubmit({
  authClient,
  actorRef,
  chatNew,
  setActorRef,
  setChatNew,
  inputString,
  setInputString,
  inputPlaceholder,
  isSubmitting,
  setIsSubmitting,
  setInputPlaceholder,
  setChatOutputText,
  setChatDisplay,
  modelType,
  modelSize,
  finetuneType,
}) {
  console.log('entered llama2.js doSubmit ')
  setIsSubmitting(true)

  // Based on the values of modelType, modelSize, and finetuneType, determine the module to import
  let moduleToImport
  let numStepsFetchInference = 10
  if (modelType === 'TinyStories' && finetuneType === 'LLM') {
    switch (modelSize) {
      case '260K':
        console.log('canister - TinyStories, 260K, LLM')
        moduleToImport = import('DeclarationsCanisterLlama2_260K')
        numStepsFetchInference = 10
        break
      case '15M':
        console.log('canister - TinyStories, 15M, LLM')
        moduleToImport = import('DeclarationsCanisterLlama2')
        numStepsFetchInference = 10
        break
      case '42M':
        console.log('canister - TinyStories, 42M, LLM')
        moduleToImport = import('DeclarationsCanisterLlama2_42M')
        numStepsFetchInference = 100
        break
      case '110M':
        console.log('canister - TinyStories, 110M, LLM')
        moduleToImport = import('DeclarationsCanisterLlama2_110M')
        numStepsFetchInference = 100
        break
      default:
        console.log('canister - TinyStories, 42M, LLM')
        moduleToImport = import('DeclarationsCanisterLlama2_42M')
        numStepsFetchInference = 100
        break
    }
  } else {
    console.log('canister - TinyStories, 15M, LLM')
    moduleToImport = import('DeclarationsCanisterLlama2')
  }
  const { canisterId, createActor } = await moduleToImport

  console.log('chatNew : ', chatNew)
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
    // Call llama2 canister to check on health
    // Force a re-render, showing the WaitAnimation
    setChatDisplay('WaitAnimation')
    console.log('Calling actor_.health ')
    const responseHealth = await actor_.health()
    console.log('llama2 canister health: ', responseHealth)

    if (responseHealth) {
      console.log('llama2 canister is healthy: ', responseHealth)

      console.log('Calling actor_.ready ')
      const responseReady = await actor_.ready()
      console.log('llama2 canister ready: ', responseReady)

      if (responseReady) {
        // Ok, ready for show time...
        await fetchInference(
          actor_,
          setChatOutputText,
          chatNew,
          setChatNew,
          setChatDisplay,
          inputString,
          setInputString,
          inputPlaceholder,
          setInputPlaceholder,
          numStepsFetchInference
        )

        await waitForQueueToEmpty()
      } else {
        throw new Error(`LLM canister is not ready`)
      }
    } else {
      throw new Error(`LLM canister is not healthy`)
    }
  } catch (error) {
    console.error(error)
    // Force a re-render, showing the ChatOutput
    setChatDisplay('CanisterError')
  } finally {
    setIsSubmitting(false)
  }
}

// Called when user clicks '+ New chat' button
export async function doNewChat({
  authClient,
  actorRef,
  chatNew,
  setActorRef,
  setChatNew,
  inputString,
  setInputString,
  inputPlaceholder,
  isSubmitting,
  setIsSubmitting,
  setInputPlaceholder,
  setChatOutputText,
  setChatDisplay,
}) {
  console.log('entered llama2.js doNewChat ')
  setChatNew(true)
  setChatOutputText('')
  setChatDisplay('SelectModel')
}
