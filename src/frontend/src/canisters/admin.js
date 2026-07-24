// Client for the icgpt_admin canister (early-access gate + admin management).
//
// We build the actor from the generated candid idlFactory + @dfinity/agent
// directly (the app's SDK), instead of the generated index.js, because dfx 0.32
// generates that index against @icp-sdk/core, which this project doesn't install.
import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { idlFactory } from 'DeclarationsCanisterIcgptAdmin/icgpt_admin.did.js'

const IC_HOST_URL = process.env.IC_HOST_URL
const CANISTER_ID = process.env.CANISTER_ID_ICGPT_ADMIN

async function makeActor(authClient) {
  const identity = await authClient.getIdentity()
  const agent = new HttpAgent({ identity, host: IC_HOST_URL })
  // Local replica: fetch the root key so the agent can verify certificates.
  if (process.env.DFX_NETWORK !== 'ic') {
    try {
      await agent.fetchRootKey()
    } catch (e) {
      console.warn(
        'icgpt_admin: unable to fetch root key (is the replica up?)',
        e
      )
    }
  }
  return Actor.createActor(idlFactory, { agent, canisterId: CANISTER_ID })
}

// ----- access (any signed-in caller) --------------------------------------
export async function getMyAccess(authClient) {
  return (await makeActor(authClient)).myAccess()
}

export async function requestAccess(authClient, email) {
  return (await makeActor(authClient)).requestAccess(email)
}

// ----- admin --------------------------------------------------------------
export async function listRequests(authClient) {
  return (await makeActor(authClient)).listRequests()
}

export async function listWhitelist(authClient) {
  return (await makeActor(authClient)).listWhitelist()
}

export async function listAdmins(authClient) {
  return (await makeActor(authClient)).listAdmins()
}

export async function setEarlyAccess(authClient, enabled) {
  return (await makeActor(authClient)).setEarlyAccess(enabled)
}

// principal args from the lists are already Principal objects; pass them through.
export async function approveRequest(authClient, principal) {
  return (await makeActor(authClient)).approve(principal)
}

export async function rejectRequest(authClient, principal) {
  return (await makeActor(authClient)).reject(principal)
}

export async function removeFromWhitelist(authClient, principal) {
  return (await makeActor(authClient)).removeFromWhitelist(principal)
}

export async function removeAdmin(authClient, principal) {
  return (await makeActor(authClient)).removeAdmin(principal)
}

// text-entered principals (admin typed them) -> Principal.
export async function addToWhitelist(authClient, principalText, email, note) {
  const actor = await makeActor(authClient)
  return actor.addToWhitelist(Principal.fromText(principalText), email, note)
}

export async function addAdmin(authClient, principalText, who) {
  const actor = await makeActor(authClient)
  return actor.addAdmin(Principal.fromText(principalText), who)
}

// ----- usage metering (controller) ----------------------------------------
export async function listUsage(authClient) {
  return (await makeActor(authClient)).listUsage()
}

export async function getEarlyAccessCallCap(authClient) {
  return (await makeActor(authClient)).getEarlyAccessCallCap()
}

export async function setEarlyAccessCallCap(authClient, n) {
  return (await makeActor(authClient)).setEarlyAccessCallCap(BigInt(n))
}
