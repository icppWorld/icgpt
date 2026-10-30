import React from 'react'
import { getEnvironment } from '../canisters/admin'

// The deploy environment of the icgpt_admin canister this frontend talks to:
// "production" | "staging" | "local". icgpt_admin derives it from the ICGPT_ENV canister
// environment variable that icp.yaml sets per environment, so the frontend build is the
// same everywhere. Fetched once (anonymous query) and shared by every caller.
let environmentPromise = null

function fetchEnvironment() {
  if (!environmentPromise) {
    environmentPromise = getEnvironment().catch((e) => {
      console.error('icgpt_admin getEnvironment failed', e)
      environmentPromise = null // retry on the next mount
      return 'production' // no header on failure: never claim staging/local without proof
    })
  }
  return environmentPromise
}

// Returns the environment, or null while it is still loading.
export function useEnvironment() {
  const [environment, setEnvironment] = React.useState(null)
  React.useEffect(() => {
    let alive = true
    fetchEnvironment().then((e) => {
      if (alive) setEnvironment(e)
    })
    return () => {
      alive = false
    }
  }, [])
  return environment
}
