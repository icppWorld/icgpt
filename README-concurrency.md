# ICGPT concurrency model — how the app serves multiple users

This note explains what happens when many people use ICGPT at the same time:
what is isolated, what is shared, where the throughput limit is, and which
numbers stay exact vs. get noisy under load. It reflects the hard-gate design on
the `experimental/controller-hard-gate` branch.

## The request path

Every browser talks to **one shared controller canister** (`icgpt_admin`,
`src/backend/main.mo`) using its own Internet Identity. The controller is the
**only** caller allowed to reach the LLM canisters (the "hard gate": each LLM is
`set_access` level 0 = controllers-only, and `icgpt_admin` is a controller of
each). All inference funnels through it:

```
User A ─┐
User B ─┼─▶  icgpt_admin  ─┬─▶  llama_cpp_qwen3_06b_q8    (Qwen3, 1 canister)
User C ─┘   (1 canister)   └─▶  llama_cpp_qwen25_05b_q8   (Qwen2.5, 1 canister)
```

The frontend (`src/frontend/src/canisters/llamacpp.js`) never calls an LLM
directly — it calls `icgpt_admin.new_chat(model, input)` / `run_update(input)`,
which proxy per call so the browser keeps streaming tokens.

## Isolated per user vs. shared

**Isolated per user** — the key mechanism is `rewriteCachePath` in `main.mo`:

- The controller rewrites every user's `--prompt-cache` argument to
  `<caller-principal>/prompt.cache`, derived from `msg.caller` (unspoofable). So
  each user's conversation lives in **their own prompt-cache file** in the LLM
  canister's stable memory. Users cannot read or corrupt each other's chats.
- Each caller is **pinned** to the model they chose at `new_chat`
  (`callerLlm : [(Principal, Nat)]`), so their `run_update` calls always continue
  on the same LLM canister where their cache lives. (Switching models in the UI
  starts a fresh conversation for exactly this reason — a chat can't hop
  canisters.)
- Usage metering (`usage : [(Principal, UsageStat)]`) is keyed by principal, and
  the read-modify-write in `run_update` happens with no `await` in between, so
  per-user counters can't be lost to interleaving.

**Shared** — the expensive part:

- Each LLM canister has **one** model loaded in heap with **one** KV-cache buffer
  (~1.76 GiB for Qwen3 at `--ctx-size 16384`). That buffer is **reused across all
  users, one request at a time**. To serve user A, the canister loads A's
  prompt-cache file into the buffer, generates, and saves it back; then it does
  the same for B. Users **time-share the single KV buffer by swapping prompt
  caches in and out** — that's how one canister serves many conversations without
  a per-user buffer. The per-user state is a cheap cache file; the costly buffer
  is allocated once.

## The execution model under concurrency

The Internet Computer executes **one update call per canister at a time**.
Messages to a canister are serialized; only a downstream `await` lets _other_
messages interleave. Two consequences:

1. **The LLM canister is the throughput bottleneck.** If 10 users chat with
   Qwen3 at once, their `run_update` calls **queue at the Qwen3 canister** and run
   one-by-one. A single reply is already many slow update calls (~20 tokens/call,
   capped by `set_max_tokens` to stay under the IC instruction limit), so
   concurrent users on the same model see their calls interleaved with everyone
   else's → longer wall-clock replies. Nobody is locked out; they share the serial
   throughput.

2. **The controller pipelines, it does not serialize.** When `icgpt_admin` does
   `await llmActor.run_update(...)`, that message suspends at the `await`, so the
   controller can begin handling the next user's request while waiting on the LLM.
   So the controller is not a hard serial wall — it interleaves at its `await`
   points. The hard serial point is each LLM canister.

## Load distribution

The two models are **two separate canisters**, so Qwen3 users and Qwen2.5 users
do not compete for the same canister. Routing is model-keyed: `new_chat(model, …)` looks the model up in the registry `llmCanisters : [(modelKey, canisterId)]`
(`modelKey` = the gguf filename) and pins the caller to that canister.

This registry is the natural hook for scaling: to add a **replica pool** per
model (several canisters serving the same gguf, load-balanced round-robin), the
registry and `new_chat` routing would extend to pick the least-loaded replica for
that model at conversation start. Today it is one canister per model.

## Limits and caveats (be honest about these)

- **Per-call cost/speed stats get imprecise under concurrent load on the same
  model.** The controller measures the **exact cycle cost** by reading the LLM's
  live balance right before and after the call (`llmBalance` via the management
  canister's `canister_status`, i.e. `balBefore`/`balAfter`), and **tok/s** by
  bracketing IC system time (`t0`/`t1`). If a _second_ user's call to the same LLM
  slips between one user's before/after reads, the balance drop (and the elapsed
  time) is attributed to the wrong call. These numbers are exact when calls to a
  given canister do not overlap, and noisy when they do. Token counts stay
  per-user-correct; only cost/$ and tok/s are affected.

- **Two management-canister calls per inference call.** Each `run_update` does a
  `canister_status` before and after (for the live balance). That overhead scales
  with traffic — a candidate to sample or make optional if concurrency grows.

- **No fair queue or global rate limiter.** There is a blunt per-user call budget
  (`earlyAccessCallCap`, enforced at `new_chat`) and the early-access whitelist
  gating _who_ can use it, but no priority, fair-queue, or global throttle — you
  rely on the IC's natural message serialization.

- **Stable-memory growth is bounded by a timer.** Many concurrent users = many
  prompt-cache files. The llama_cpp_canister's cache-cleanup timer (default 6h
  TTL) sweeps abandoned caches so stable memory does not grow unbounded. It must
  be re-armed after every install/upgrade (`cache_cleanup_start_timer`).

- **Cycles.** Every inference call burns the LLM canister's cycles; concurrent
  users burn them faster. The cycle-balance monitoring timer
  (`cycle_balance_start_timer`) tracks the balance so it can be topped up.

- **The frontend is fully independent per browser** — the smooth-streaming painter,
  the retry/back-off on transient boundary-node errors (429/503, which _do_ happen
  under load; see `withRetry` in `llamacpp.js`), and the stats all live in each
  user's tab.

## Summary

| Concern            | How it is handled                                                         |
| ------------------ | ------------------------------------------------------------------------- |
| Cross-user safety  | Per-principal prompt-cache files (`rewriteCachePath`); per-caller pinning |
| Serving many users | One KV buffer per LLM canister, time-shared by swapping prompt caches     |
| Ordering           | IC serializes update calls per canister; controller interleaves at awaits |
| Load spreading     | One canister per model (registry is keyed for future replica pools)       |
| Throughput ceiling | Each model canister serves one inference at a time                        |
| Stat fidelity      | Exact when a canister's calls don't overlap; noisy under same-model load  |

**Bottom line:** correctness and isolation under concurrency are solid — no
cross-user corruption is possible. The ceiling is **throughput** (one inference
per model canister at a time), and the main fidelity caveat is that the exact
cost/speed stats assume calls to a given canister are not overlapping. Scaling
further means adding replica canisters per model behind the controller.
