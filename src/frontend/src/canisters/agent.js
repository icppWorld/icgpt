// Shared IC agent/actor helpers for the frontend, built on @icp-sdk/core.
//
// Canister IDs and the replica root key come from the `ic_env` cookie at RUNTIME
// (safeGetCanisterEnv), not from build-time env vars: the asset canister sets the
// cookie in production, and the webpack dev server sets it locally (see
// webpack.config.js). This replaced the old .env / DFX_NETWORK / process.env
// .CANISTER_ID_* injection and the agent.fetchRootKey() branch — the root key
// arrives in the cookie for both local and mainnet.
import { HttpAgent, Actor } from '@icp-sdk/core/agent'
import { safeGetCanisterEnv } from '@icp-sdk/core/agent/canister-env'

// Resolved once at module load. The cookie is present in document.cookie by the
// time app code runs (served with the HTML), so this is safe to read eagerly.
const canisterEnv = safeGetCanisterEnv()

// Canister id for a project canister name, from the ic_env cookie
// (key form: "PUBLIC_CANISTER_ID:<name>"). Returns undefined if absent.
export function canisterIdFor(name) {
  return canisterEnv?.[`PUBLIC_CANISTER_ID:${name}`]
}

// Build an authenticated actor for `canisterId` using the caller's II identity.
// Uses the @icp-sdk/core Actor API with a pre-built agent (same candid lineage as
// the old @dfinity/agent, so decoding of results is unchanged). The root key comes
// from the cookie — no fetchRootKey() and no local/ic branching.
export async function makeActor(idlFactory, canisterId, authClient) {
  const identity = await authClient.getIdentity()
  const agent = await HttpAgent.create({
    identity,
    host: window.location.origin,
    rootKey: canisterEnv?.IC_ROOT_KEY,
  })
  return Actor.createActor(idlFactory, { agent, canisterId })
}
