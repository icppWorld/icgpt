// Client for the icgpt_admin canister (early-access gate + admin management).
//
// Actors are built from the committed candid idlFactory (didc-generated, see
// ./idl/icgpt_admin.idl.js) + @icp-sdk/core. The canister id + root key come from
// the ic_env cookie at runtime (see ./agent.js).
import { Principal } from '@icp-sdk/core/principal'
import { idlFactory } from './idl/icgpt_admin.idl.js'
import { canisterIdFor, makeActor } from './agent'

const CANISTER_ID = canisterIdFor('icgpt_admin')

function adminActor(authClient) {
  return makeActor(idlFactory, CANISTER_ID, authClient)
}

// ----- access (any signed-in caller) --------------------------------------
export async function getMyAccess(authClient) {
  return (await adminActor(authClient)).myAccess()
}

export async function requestAccess(authClient, useCase) {
  return (await adminActor(authClient)).requestAccess(useCase)
}

// ----- admin --------------------------------------------------------------
export async function listRequests(authClient) {
  return (await adminActor(authClient)).listRequests()
}

export async function listWhitelist(authClient) {
  return (await adminActor(authClient)).listWhitelist()
}

export async function listAdmins(authClient) {
  return (await adminActor(authClient)).listAdmins()
}

export async function setEarlyAccess(authClient, enabled) {
  return (await adminActor(authClient)).setEarlyAccess(enabled)
}

// principal args from the lists are already Principal objects; pass them through.
export async function approveRequest(authClient, principal) {
  return (await adminActor(authClient)).approve(principal)
}

export async function rejectRequest(authClient, principal) {
  return (await adminActor(authClient)).reject(principal)
}

export async function removeFromWhitelist(authClient, principal) {
  return (await adminActor(authClient)).removeFromWhitelist(principal)
}

export async function removeAdmin(authClient, principal) {
  return (await adminActor(authClient)).removeAdmin(principal)
}

// text-entered principals (admin typed them) -> Principal.
export async function addToWhitelist(authClient, principalText, email, note) {
  const actor = await adminActor(authClient)
  return actor.addToWhitelist(Principal.fromText(principalText), email, note)
}

export async function addAdmin(authClient, principalText, who) {
  const actor = await adminActor(authClient)
  return actor.addAdmin(Principal.fromText(principalText), who)
}

// ----- usage metering (controller) ----------------------------------------
export async function listUsage(authClient) {
  return (await adminActor(authClient)).listUsage()
}

export async function getEarlyAccessCallCap(authClient) {
  return (await adminActor(authClient)).getEarlyAccessCallCap()
}

export async function setEarlyAccessCallCap(authClient, n) {
  return (await adminActor(authClient)).setEarlyAccessCallCap(BigInt(n))
}
