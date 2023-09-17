// Functions to interact with the icpp_llama2 canister
import { canisterId, createActor } from 'DeclarationsCanisterLlama2'

const IC_HOST_URL = process.env.IC_HOST_URL

async function fetchInference(actor, setChatOutputText) {
  const params = {
    prompt: '',
    steps: 10,
    temperature: 0.0,
    topp: 0.9,
    rng_seed: 0,
  }

  for (let i = 0; i < 20; i++) {
    const response = await actor.inference(params)

    console.log('response from inference:', response)

    const text = response.ok // Extract the text from the "ok" key

    if (typeof text === 'string') {
      // Confirm it's a string
      const words = text.split(' ')

      for (let j = 0; j < words.length; j++) {
        const word = words[j];
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
      const textToAppend = prependSpace ? " " + word : word
      setChatOutputText(prevText => prevText + textToAppend)
      resolve() // Signal that the promise is done
    }, 500) // 500ms delay between each word
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
        if (chatNew) {
          console.log('Calling actor_.new_chat ')
          const responseNewChat = await actor_.new_chat()
          console.log('llama2 canister new_chat: ', responseNewChat)

          // This will force a re-render, switching from ChatSelectModel to ChatOutput
          setChatNew(false)
          // Force a re-render, showing the ChatOutput
          setChatDisplay('ChatOutput')
        }

        // Ok, ready for show time...
        setChatOutputText('')
        await fetchInference(actor_, setChatOutputText)
        // setChatOutputText(
        //   "(HARD-CODED, NOT YET GENERATED BY LLM: Once upon a time, my teddy, Mr. Fluffles, went on a big adventure in the backyard. He climbed Mount Sofa, swam the Deep Blue Puddle, and even flew in the air when I threw him. We had a picnic with cookies, but then, oh no! Mr. Fluffles got cookie crumbs on him. So, we had a bath together with lots of bubbles. Mommy said, 'It’s bedtime.' But we weren’t sleepy, so we told each other stories. Mr. Fluffles whispered a secret, 'You're my best friend.' And I whispered back, 'Forever and ever.' Then, we closed our eyes. Goodnight."
        // )
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
