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

// ----- LLM-as-judge (Prompt Cost Lab quality signal) ----------------------
// Scores a reply 0..100 against a rubric via the free on-chain DFINITY LLM canister.
// Returns { ok: { score, samples, note } } | { err: text }.
export async function judge(authClient, reply, rubric) {
  return (await adminActor(authClient)).judge(reply, rubric)
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

// ----- monitoring log -----------------------------------------------------
// Admin-only: recent failure events (model not-ready/errors, trapped LLM calls, client
// reports). limit 0 = all (bounded to LOG_CAP on-chain), else the most recent `limit`.
export async function getLogs(authClient, limit = 0) {
  return (await adminActor(authClient)).getLogs(BigInt(limit))
}

// Best-effort client-side event report (eg. inference that exhausted the frontend's retries).
// Fire-and-forget: callers should not await it on the hot path, and should swallow errors.
export async function logClientEvent(authClient, kind, detail) {
  return (await adminActor(authClient)).logClientEvent(kind, detail)
}

// ----- cycles monitoring (public /canisters page) -------------------------
// Cached cycle-balance snapshot for icgpt_admin + each LLM (refreshed on-chain by a 10-min
// timer). Non-anonymous query, so a signed-in authClient is required. Returns
// { canisters: [{ name, canisterId, cycles }], updatedAt } (empty for anonymous callers).
export async function getCyclesReport(authClient) {
  return (await adminActor(authClient)).getCyclesReport()
}

// ----- Prompt Cost Lab: on-chain per-principal persistence ----------------
// The Lab's run history + current report + editor setup, stored per-caller in
// icgpt_admin as one opaque JSON blob (shape owned by common/labState.js), so the
// Lab survives logout / reload / a new device. Non-anonymous.
export async function getLabState(authClient) {
  return (await adminActor(authClient)).getLabState()
}

// Save the JSON blob. Returns { ok } | { err: text } (oversize -> err). Callers
// fire-and-forget and swallow errors — in-memory state still works this session.
export async function saveLabState(authClient, json) {
  return (await adminActor(authClient)).saveLabState(json)
}

export async function clearLabState(authClient) {
  return (await adminActor(authClient)).clearLabState()
}
