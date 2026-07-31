// Retry transient failures of on-chain calls with exponential backoff.
//
// A call to a canister can fail at the transport level: a network blip, a boundary-node
// 429/503, a request timeout, or - only on the local replica - the fetchRootKey
// certificate race. These are transient: the canister was either never reached or its
// reply was lost, so retrying is safe and usually succeeds.
//
// Application-level errors are NOT retried here: a canister returns those as `{ Err }` in
// a SUCCESSFUL response (eg. access denied, model not loaded), not as a thrown exception,
// so callers still handle those as final. (This is why wrapping a query like `myAccess`
// is safe: a real "not allowed" comes back in the record, never as a throw - any throw is
// infrastructure and worth retrying.)
const RETRY_MAX_ATTEMPTS = 4
const RETRY_BASE_DELAY_MS = 500
const RETRY_MAX_DELAY_MS = 8000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Runs fn(), retrying on any THROWN error with exponential backoff (500ms → 8s, up to
// RETRY_MAX_ATTEMPTS). Returns { result, durationMs }, where durationMs times ONLY the
// successful attempt (no backoff). `onRetry(attempt, delayMs)` is called before each
// backoff so the UI can show progress. Rethrows the last error once attempts run out.
export async function withRetry(fn, label, onRetry) {
  for (let attempt = 1; ; attempt += 1) {
    const startedMs = performance.now()
    try {
      const result = await fn()
      return { result, durationMs: performance.now() - startedMs }
    } catch (error) {
      if (attempt >= RETRY_MAX_ATTEMPTS) {
        console.error(
          `withRetry [${label}] gave up after ${attempt} attempts: ${error.message}`
        )
        throw error
      }
      const delayMs = Math.min(
        RETRY_MAX_DELAY_MS,
        RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      )
      console.warn(
        `withRetry [${label}] attempt ${attempt} failed (${error.message}); retrying in ${delayMs}ms`
      )
      if (onRetry) onRetry(attempt, delayMs)
      await sleep(delayMs)
    }
  }
}
