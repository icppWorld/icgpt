// Functions to interact with the icpp_llama2 canister
import { canisterId, createActor } from 'DeclarationsCanisterLlama2'

const IC_HOST_URL = process.env.IC_HOST_URL

export async function doSubmit({
  authClient,
  actorRef,
  chatNew,
  setActorRef,
  setChatNew,
  setPromptRef,
  text,
}) {
  let actor_ = actorRef.current
  if (chatNew) {
    const identity = await authClient.getIdentity()
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
    const responseHealth = await actor_.health()
    console.log('llama2 canister health: ', responseHealth)

    if (responseHealth) {
      console.log('llama2 canister is healthy: ', responseHealth)
      setPromptRef(text)
      if (chatNew) {
        setChatNew(false) // This will force a re-render
      }
    } else {
      throw new Error(
        `llama2 canister is not healthy`
      )
    }
  } catch (error) {
    console.error(error)
  }
}
