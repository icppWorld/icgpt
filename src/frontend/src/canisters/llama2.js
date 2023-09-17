// Functions to interact with the icpp_llama2 canister
import { canisterId, createActor } from 'DeclarationsCanisterLlama2'

const IC_HOST_URL = process.env.IC_HOST_URL

const displayQueue = []
let isDisplaying = false

async function fetchInference(
  actor,
  setChatOutputText,
  chatNew,
  setChatNew,
  setChatDisplay
) {
  const params = {
    prompt: '',
    steps: 10,
    temperature: 0.0,
    topp: 0.9,
    rng_seed: 0,
  }

  // Start the display loop in the background
  processDisplayQueue(setChatDisplay, setChatOutputText)

  for (let i = 0; i < 20; i++) {
    let response

    if (i === 0 && chatNew) {
      console.log('Calling actor_.new_chat ')
      const responseNewChat = await actor.new_chat()
      console.log('llama2 canister new_chat: ', responseNewChat)
      console.log('Calling inference for next tokens...')
      response = await actor.inference(params)

      // Now we can force a re-render and switch to an empty output
      setChatNew(false)
      setChatOutputText('')
    } else {
      console.log('Calling inference for next tokens...')
      response = await actor.inference(params)
    }

    // Push the response to the queue and the display loop will pick it up
    displayQueue.push(response)
  }
}

async function processDisplayQueue(setChatDisplay, setChatOutputText) {
  while (true) {
    if (displayQueue.length > 0 && !isDisplaying) {
      isDisplaying = true
      const response = displayQueue.shift()
      await displayResponse(response, setChatDisplay, setChatOutputText)
      isDisplaying = false
    } else {
      await sleep(100)
    }
  }
}

function displayResponse(response, setChatDisplay, setChatOutputText) {
  // force a re-render showing the ChatOutput
  setChatDisplay('ChatOutput')

  console.log('response from inference:', response)

  const responseString = response.ok // Extract the responseString from the "ok" key

  if (typeof responseString !== 'string') {
    console.error('Received unexpected response format:', response)
    return Promise.reject(new Error('Unexpected response format'))
  }

  const words = responseString.split(' ')

  // Use reduce to chain promises sequentially
  return words.reduce((acc, word, j) => {
    return acc.then(() => {
      const prependSpace = j !== 0
      console.log('prependSpace: ', prependSpace)
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

export async function doSubmit({
  authClient,
  actorRef,
  chatNew,
  setActorRef,
  setChatNew,
  setPromptRef,
  inputString,
  setChatOutputText,
  setChatDisplay,
}) {
  console.log('entered llama2.js doSubmit ')
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
        setPromptRef(inputString)

        // Ok, ready for show time...
        await fetchInference(
          actor_,
          setChatOutputText,
          chatNew,
          setChatNew,
          setChatDisplay
        )
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
  }
}
