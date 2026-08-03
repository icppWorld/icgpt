// ---- LOCAL-DEV ONLY: sign in with a deterministic key identity, no Internet Identity ----
//
// This module exists solely so local development/testing (and headless automation) can get an
// authenticated session with one click, skipping the II passkey ceremony.
//
// It is NEVER compiled into the production bundle: LoginWithInternetIdentity.jsx `require()`s it
// only behind the build-time literal `__DEV_SIGN_IN__` (set from webpack's WEBPACK_SERVE — true
// under `webpack serve`, false in the production `webpack` build). With the literal false, webpack
// dead-code-elimination drops this whole module and its `Ed25519KeyIdentity` import from prod.
//
// The identity is DETERMINISTIC: `Ed25519KeyIdentity.generate(seed)` with a fixed 32-byte seed
// yields the SAME principal every run, on every machine/browser. That principal is granted
// early-access on the LOCAL replica by `make icp-whitelist-dev` (a call to the admin
// `addToWhitelist`); it is deliberately NOT added to Bootstrap.mo, because bootstrap principals
// are permanent ADMINS and this seed is public in source — see the plan for the reasoning.
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity'

// A fixed 32-byte seed. Keep it in sync with the DEV_PRINCIPAL pinned in the Makefile
// (`icp-whitelist-dev`); changing the seed changes the derived principal.
const DEV_SEED = new TextEncoder().encode('icgpt-local-dev-signin-seed-0001')

// The principal derived from DEV_SEED (for reference; recompute if the seed changes):
//   u4erc-wu23y-oo5dh-sorei-yyceo-kzk6w-ejh2f-jzrbr-immca-i3vsa-pae
export function makeDevIdentity() {
  return Ed25519KeyIdentity.generate(DEV_SEED)
}

// Same legacy adapter surface as makeAuthAdapter (getIdentity/logout), but backed by the local
// key identity. logout() is a no-op — the deterministic identity is regenerated on next sign-in.
export function makeDevAdapter(identity) {
  return {
    getIdentity: () => identity,
    logout: () => {},
    _dev: true,
  }
}
