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

function backoffMs(attempt) {
  return Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
}

// Runs fn(), retrying on any THROWN error with exponential backoff (500ms → 8s, up to
// RETRY_MAX_ATTEMPTS). Returns { result, durationMs }, where durationMs times ONLY the
// successful attempt (no backoff). `onRetry(attempt, delayMs)` is called before each
// backoff so the UI can show progress. Rethrows the last error once attempts run out.
//
// Optional `shouldRetryResult(result) → bool`: some canister calls report a TRANSIENT failure
// as a SUCCESSFUL response with an `{ Err }` arm (eg. a model momentarily "not ready") rather
// than a throw. When provided and it returns true, that result is treated like a transient
// thrown error - back off and retry. Once attempts run out the last result is RETURNED (not
// thrown), so the caller still surfaces the real error. Callers without the predicate are
// unaffected (thrown-only retry, exactly as before).
export async function withRetry(fn, label, onRetry, shouldRetryResult) {
  for (let attempt = 1; ; attempt += 1) {
    const startedMs = performance.now()
    try {
      const result = await fn()
      if (
        shouldRetryResult &&
        attempt < RETRY_MAX_ATTEMPTS &&
        shouldRetryResult(result)
      ) {
        const delayMs = backoffMs(attempt)
        console.warn(
          `withRetry [${label}] attempt ${attempt} returned a retryable result; retrying in ${delayMs}ms`
        )
        if (onRetry) onRetry(attempt, delayMs)
        await sleep(delayMs)
        continue
      }
      return { result, durationMs: performance.now() - startedMs }
    } catch (error) {
      if (attempt >= RETRY_MAX_ATTEMPTS) {
        console.error(
          `withRetry [${label}] gave up after ${attempt} attempts: ${error.message}`
        )
        throw error
      }
      const delayMs = backoffMs(attempt)
      console.warn(
        `withRetry [${label}] attempt ${attempt} failed (${error.message}); retrying in ${delayMs}ms`
      )
      if (onRetry) onRetry(attempt, delayMs)
      await sleep(delayMs)
    }
  }
}

// A transient/infra failure worth retrying (status 0/408/425/429/5xx) vs a permanent one.
const RETRYABLE_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504])
const RETRYABLE_MSG =
  /not ready|not healthy|not loaded|reload|busy|temporarily|timeout|unavailable|LLM call failed/i
// Permanent rejections (gate / quota / bad request) - surface immediately, never retry.
const PERMANENT_MSG =
  /access denied|early access|unknown model|usage limit|no LLM configured|session LLM unavailable/i

// Classify an inference application-error (returned as `{ Err }` in a SUCCESSFUL response) as
// retryable (transient "not ready" / infra) or not (permanent gate/quota). The controller now
// tags transient infra failures with status 503 and permanent gate errors with 403, so status
// is authoritative; the message patterns are a belt-and-suspenders fallback.
export function classifyInferenceError(statusCode, errText) {
  const t = errText || ''
  if (PERMANENT_MSG.test(t)) return false
  if (statusCode === 403) return false
  if (RETRYABLE_STATUS.has(statusCode)) return true
  return RETRYABLE_MSG.test(t)
}
