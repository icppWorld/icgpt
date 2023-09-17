// Functions to interact with the icpp_llama2 canister
import { canisterId, createActor } from 'DeclarationsCanisterLlama2'

const IC_HOST_URL = process.env.IC_HOST_URL

async function fetchInference(actor, setChatOutputText, chatNew, setChatNew, setChatDisplay) {
  const params = {
    prompt: '',
    steps: 10,
    temperature: 0.0,
    topp: 0.9,
    rng_seed: 0,
  }

  for (let i = 0; i < 20; i++) {
    let response
    if (i === 0 && chatNew) {
      // The astronaut is still spinning
      console.log('Calling actor_.new_chat ')
      const responseNewChat = await actor.new_chat()
      console.log('llama2 canister new_chat: ', responseNewChat)
      response = await actor.inference(params)

      // Now we can force a re-render and switch to an empty output text
      setChatNew(false)
      setChatOutputText('')
    }
    else {
      response = await actor.inference(params)
    }

    // force a re-render showing the ChatOutput
    setChatDisplay('ChatOutput')

    // Process the response
    console.log('response from inference:', response)

    const text = response.ok // Extract the text from the "ok" key

    if (typeof text === 'string') {
      // Confirm it's a string
      const words = text.split(' ')

      for (let j = 0; j < words.length; j++) {
        const word = words[j]
        const prependSpace = j !== 0
        console.log('prependSpace: ', prependSpace)
        await delayAndAppend(setChatOutputText, word, prependSpace)
      }
    } else {
      console.error('Received unexpected response format:', response)
    }
  }
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
  text,
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
        setPromptRef(text)

        // Ok, ready for show time...
        await fetchInference(actor_, setChatOutputText, chatNew, setChatNew, setChatDisplay)

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
