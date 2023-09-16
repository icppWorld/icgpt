// Functions to interact with the icpp_llama2 canister
import { canisterId, createActor } from 'DeclarationsCanisterLlama2'

const IC_HOST_URL = process.env.IC_HOST_URL

export async function doSubmit({
  authClient,
  actor,
  chatNew,
  setActor,
  setChatNew,
  setPrompt,
  text,
}) {
  let actor_ = actor
  if (chatNew) {
    const identity = await authClient.getIdentity()
    actor_ = createActor(canisterId, {
      agentOptions: {
        identity,
        host: IC_HOST_URL,
      },
    })
    setActor(actor_)
    setPrompt(text)
    setChatNew(false)
  }

  try {
    // Call llama2 canister to check on health
    const responseHealth = await actor_.health()
    console.log('llama2 canister health: ', responseHealth)

    // if (responseHealth.ok) {
    //   // console.log('Django server health: ', await responseHealth.json())
    // } else {
    //   throw new Error(
    //     `llama2 canister is not healthy - Status: ${responseHealth.status}`
    //   )
    // }
  } catch (error) {
    console.error(error)
  }
}
