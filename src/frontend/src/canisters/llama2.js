// Functions to interact with the llama2_c canister

const IC_HOST_URL = process.env.IC_HOST_URL

const displayQueue = []
let isDisplaying = false
let chatStarted = false
let chatFinished = false

const params = {
  prompt: '',
  steps: 60,
  temperature: 0.1,
  topp: 0.9,
  rng_seed: 0,
}

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
  chatDone,
  setChatDone,
  setChatDisplay,
  inputString,
  setInputString,
  inputPlaceholder,
  setInputPlaceholder,
  numStepsFetchInference
) {
  // Helper function to split the inputString into chunks of 20 words
  // Use 30, to avoid going over 60 max steps (tokens)
  const splitIntoChunks = (str) => {
    const words = str.split(/\s+/)
    const chunks = []
    for (let i = 0; i < words.length; i += 20) {
      chunks.push(words.slice(i, i + 20).join(' '))
    }
    return chunks
  }

  // Chunk the inputString and save for processing
  const inputChunks = splitIntoChunks(inputString)
  let currentChunkIndex = 0

  // Start the display loop in the background
  processDisplayQueue(
    chatDone,
    setChatDisplay,
    setChatOutputText,
    setInputString,
    setInputPlaceholder
  )

  let count = 0
  let responseNewChat
  let response
  for (let i = 0; i < numStepsFetchInference; i++) {
    count++

    // Update the params.prompt to the next chunk of inputString
    if (currentChunkIndex < inputChunks.length) {
      params.prompt = inputChunks[currentChunkIndex]
      currentChunkIndex++
    } else {
      params.prompt = '' // Reset to empty if no chunks left
    }

    if (i === 0 && chatNew) {
      try {
        console.log('Calling new_chat ')
        const response = await actor.new_chat()
        if ('Ok' in response) {
          console.log('Call to new_chat successful')
        } else {
          let ermsg = ''
          if ('Err' in response && 'Other' in response.Err)
            ermsg = response.Err.Other
          throw new Error(`Call to new_chat failed: ` + ermsg)
        }
      } catch (error) {
        // caught by caller and printed to console there
        throw new Error(`Error: ${error.message}`)
      }

      try {
        console.log('Calling inference with prompt: ', params.prompt)
        responseNewChat = await actor.inference(params)
        if ('Ok' in responseNewChat) {
          console.log('Call to inference successful')
          // Now we can force a re-render and switch to an empty output
          setChatNew(false)
          setChatDone(false) // react state usage at App level
          chatStarted = true
          chatFinished = false // local usage
          // Don't do this yet. We do this after next inference call.
          // setChatOutputText('')
          // setInputPlaceholder('The LLM is generating text...')
          // Push the response to the queue and the display loop will pick it up
          // displayQueue.push(responseNewChat)
        } else {
          let ermsg = ''
          if ('Err' in responseNewChat && 'Other' in responseNewChat.Err)
            ermsg = responseNewChat.Err.Other
          throw new Error(`Call to inference failed: ` + ermsg)
        }
      } catch (error) {
        // caught by caller and printed to console there
        throw new Error(`Error: ${error.message}`)
      }
    } else {
      try {
        console.log('Calling inference with prompt: ', params.prompt)
        response = await actor.inference(params)
        if ('Ok' in response) {
          console.log('Call to inference successful')

          if (i === 1) {
            // Now Push the response of the very first inference of a new chat to the queue
            // and the display loop will pick it up and start streaming
            setChatOutputText('')
            setInputPlaceholder('The LLM is generating text...')
            displayQueue.push(responseNewChat)
          }
          // Push the response to the queue and the display loop will pick it up
          displayQueue.push(response)
          // We reached end of story if the number of generated tokens is less than the requested
          if (response.Ok.num_tokens < params.steps) {
            // Reset the inputString and provide a new placeHolder
            setInputString('')
            console.log('-A- setChatDone(true)')
            setChatDone(true)
            chatStarted = false
            chatFinished = true
            setInputPlaceholder('The end!')
            break
          } 
          // else {
          //   console.log('-B- setChatDone(false)')
          //   setChatDone(false)
          //   chatFinished = false
          //   setInputPlaceholder('The LLM is generating text...')
          // }
        } else {
          let ermsg = ''
          if ('Err' in response && 'Other' in response.Err)
            ermsg = response.Err.Other
          throw new Error(`Call to inference failed: ` + ermsg)
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
    setInputPlaceholder('Continue the story...')
  }
}

async function processDisplayQueue(
  chatDone,
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
      if (chatStarted && !chatFinished){
        setChatDisplay('WaitAnimation')
      }
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

  const responseString = response.Ok.inference

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
    }, 125) // ms delay between each word
  })
}

// Called when user clicks 'submit' button
export async function doSubmit({
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
        moduleToImport = import('DeclarationsCanisterLlama2_15M')
        numStepsFetchInference = 100
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
    moduleToImport = import('DeclarationsCanisterLlama2_15M')
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

      console.log('Calling actor_.ready ')
      const responseReady = await actor_.ready()
      console.log('llm canister ready: ', responseReady)

      if ('Ok' in responseReady) {
        // Ok, ready for show time...
        await fetchInference(
          actor_,
          setChatOutputText,
          chatNew,
          setChatNew,
          chatDone,
          setChatDone,
          setChatDisplay,
          inputString,
          setInputString,
          inputPlaceholder,
          setInputPlaceholder,
          numStepsFetchInference
        )

        await waitForQueueToEmpty()
      } else {
        let ermsg = ''
        if ('Err' in responseReady && 'Other' in responseReady.Err)
          ermsg = responseReady.Err.Other
        throw new Error(`LLM canister is not ready: ` + ermsg)
      }
    } else {
      let ermsg = ''
      if ('Err' in responseHealth && 'Other' in responseHealth.Err)
        ermsg = responseHealth.Err.Other
      throw new Error(`LLM canister is not healthy: ` + ermsg)
    }
  } catch (error) {
    console.error(error)
    setChatDone(true)
    chatFinished = true
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
}) {
  console.log('entered llama2.js doNewChat ')
  setChatNew(true)
  setChatDone(false)
  chatFinished = false
  setChatOutputText('')
  setChatDisplay('SelectModel')
}
