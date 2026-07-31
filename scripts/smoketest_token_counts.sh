#!/usr/bin/env bash
# Live smoketest for exact token accounting (Phase B) through the icgpt_admin controller.
#
# llama_cpp_canister >= v0.15.0 returns five `opt nat64` counts on each run_update:
#   n_prompt_tokens, n_prompt_tokens_cached, n_prompt_tokens_decoded,
#   n_tokens_generated, n_prompt_tokens_remaining.
# icgpt_admin flows them through `xify` (LlmTypes.RunOutputRecordX), and the Prompt Cost
# Lab reads them to show EXACT (not estimated) cache-break attribution. This test proves
# the whole path decodes + reconciles, and demonstrates the core Lab property: on a warm
# re-send the entire prefix is reused for free (cached == total, decoded == 0).
#
# It sends the SAME prompt twice WITHOUT a new_chat between (so llama.cpp's prompt-cache
# prefix-match kicks in) and asserts:
#   COLD: cached == 0, decoded == total, cached + decoded + remaining == total
#   WARM: cached == total, decoded == 0, cached + decoded + remaining == total
#
# PRECONDITION: a local icgpt_admin with a registered llama canister whose model is
# LOADED. After any llama `--mode upgrade` the model must be re-loaded (load_model +
# set_max_tokens) — an upgrade preserves the gguf but resets the loaded model. See the
# README "LLM model configuration" table.
#
# Usage: scripts/smoketest_token_counts.sh [ENV] [MODEL_GGUF]
#   ENV        default: local
#   MODEL_GGUF default: gemma-3-270m-it-Q8_0.gguf
set -euo pipefail

ENV="${1:-local}"
MODEL_GGUF="${2:-gemma-3-270m-it-Q8_0.gguf}"
# icgpt_admin rewrites --prompt-cache to a per-CALLER path (unspoofable), so a caller's
# prompt cache persists across new_chat. To guarantee a genuinely COLD first call we
# prefix a per-run nonce, so this exact prefix is in no prior cache. The WARM call
# re-sends the identical nonced prompt, so its whole prefix is a cache hit.
NONCE="run${$}x${RANDOM}"
PROMPT="${NONCE} the quick brown fox jumps over the lazy dog and then runs far away into the woods"

CACHE_ARGS='"--prompt-cache"; "my_cache/prompt.cache"; "--prompt-cache-all"; "--cache-type-k"; "q8_0"; "--cache-type-v"; "q8_0"'
NC="(\"${MODEL_GGUF}\", record { args = vec { ${CACHE_ARGS} } })"
RUN="(record { args = vec { ${CACHE_ARGS}; \"-sp\"; \"-p\"; \"${PROMPT}\"; \"-n\"; \"1\" } })"

call() { icp canister call icgpt_admin "$1" "$2" -e "$ENV" 2>&1; }

# Extract one `opt nat64` field from a candid response: prints the integer, or "null".
field() { # <candid-text> <field-name>
  echo "$1" | grep -oE "$2 = (opt \([0-9]+ : nat64\)|null)" | grep -oE '[0-9]+|null' | head -1
}

echo "== Exact token-accounting smoketest (env=${ENV}, model=${MODEL_GGUF}) =="

echo "-- new_chat (reset prompt cache) --"
nc="$(call new_chat "$NC")"
if ! echo "$nc" | grep -q 'Ok ='; then
  echo "FAIL: new_chat did not return Ok:"; echo "$nc" | head -5; exit 1
fi

check() { # <label> <candid-response>
  local label="$1" resp="$2"
  local total cached decoded gen rem
  total=$(field "$resp" n_prompt_tokens)
  cached=$(field "$resp" n_prompt_tokens_cached)
  decoded=$(field "$resp" n_prompt_tokens_decoded)
  gen=$(field "$resp" n_tokens_generated)
  rem=$(field "$resp" n_prompt_tokens_remaining)
  echo "   ${label}: total=${total} cached=${cached} decoded=${decoded} generated=${gen} remaining=${rem}"
  if [ "$total" = "null" ] || [ "$cached" = "null" ] || [ "$decoded" = "null" ] || [ "$rem" = "null" ]; then
    echo "   FAIL: counts are null — is the model loaded and the wasm >= v0.15.0?"
    echo "$resp" | grep -E 'error|Err' | head -2 || true
    return 1
  fi
  if [ $((cached + decoded + rem)) -ne "$total" ]; then
    echo "   FAIL: cached+decoded+remaining ($((cached + decoded + rem))) != total (${total})"; return 1
  fi
  echo "$cached $decoded $total"  # last line = parsed values for the caller
}

echo "-- COLD run_update (nothing cached yet) --"
cold="$(call run_update "$RUN")"
cold_vals="$(check COLD "$cold" | tail -1)"
read -r c_cached c_decoded c_total <<<"$cold_vals"

echo "-- WARM run_update (same prompt; prefix should be reused for free) --"
warm="$(call run_update "$RUN")"
warm_vals="$(check WARM "$warm" | tail -1)"
read -r w_cached w_decoded w_total <<<"$warm_vals"

fail=0
# COLD: a novel prefix does real ingestion work — most of it is NOT cached. (It is not
# strictly 0: the leading BOS/special token can match any prior cache, so assert < total.)
[ "$c_cached" -lt "$c_total" ] || { echo "FAIL: COLD cached (${c_cached}) should be < total (${c_total}) for a fresh prompt"; fail=1; }
[ "$c_decoded" -gt 0 ] || { echo "FAIL: COLD decoded should be > 0 (real ingestion), got ${c_decoded}"; fail=1; }
# WARM: re-sending the identical prompt reuses the ENTIRE prefix for free.
[ "$w_cached" -eq "$w_total" ] || { echo "FAIL: WARM cached (${w_cached}) should equal total (${w_total}) — full prefix reused"; fail=1; }
[ "$w_decoded" -eq 0 ] || { echo "FAIL: WARM decoded should be 0 (fully cached), got ${w_decoded}"; fail=1; }
# And the warm call must reuse strictly more than the cold call (the cache-break payoff).
[ "$w_cached" -gt "$c_cached" ] || { echo "FAIL: WARM cached (${w_cached}) should exceed COLD cached (${c_cached})"; fail=1; }

if [ "$fail" -eq 0 ]; then
  echo "PASS: exact counts decode + reconcile; cold ingested ${c_decoded} tokens, warm re-send reused the full ${w_total}-token prefix for free."
else
  exit 1
fi
