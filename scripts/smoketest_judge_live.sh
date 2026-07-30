#!/usr/bin/env bash
# Live smoketest for the Prompt Cost Lab LLM-as-judge (Phase C).
#
# The judge scores a reply 0..100 against a rubric using the FREE DFINITY LLM canister
# (Qwen3-32B, w36hm-eqaaa-aaaal-qr76a-cai). This validates that call END-TO-END against
# the real model (never mocked), exercising the exact request shape mo:llm produces from
# icgpt_admin's `judge`:
#   - variant { system = record { content = <rubric + "reply with only an integer"> } }
#   - variant { user   = record { content = <the answer> } }
# and the exact response shape it parses ( record { message = record { content = opt text }}).
#
# It asserts the model DISCRIMINATES quality: a good, non-leaking hint scores high and a
# blatant leak scores low. The deterministic wrapping/parsing/averaging around this call
# is unit-tested separately in test/Judge.test.mo (`mops test`).
#
# NOTE: a LOCAL replica cannot reach a mainnet canister, so this test always targets
# mainnet (`--network ic`). The free model attaches 0 cycles, so it costs nothing.
#
# Usage: scripts/smoketest_judge_live.sh
set -euo pipefail

LLM_CANISTER="w36hm-eqaaa-aaaal-qr76a-cai"
MODEL="qwen3:32b"
RUBRIC="A good one-sentence hint about the secret word HOUSE that never contains the word HOUSE."
SYS="You are a strict evaluator. Score how well the ANSWER satisfies the RUBRIC on a scale from 0 to 100, where 0 is total failure and 100 is perfect. Respond with ONLY a single integer between 0 and 100 - no words, no punctuation, no explanation.\nRUBRIC:\n${RUBRIC}"

# Call v1_chat live and echo the model's raw content string.
judge_once() {
  local answer="$1"
  icp canister call "$LLM_CANISTER" v1_chat "(record {
    model = \"${MODEL}\";
    messages = vec {
      variant { system = record { content = \"${SYS}\" } };
      variant { user = record { content = \"ANSWER:\n${answer}\" } };
    };
    tools = null;
  })" --network ic 2>&1
}

# Extract the first integer in [0,100] from the model output (mirrors Judge.parseScore).
parse_score() {
  echo "$1" | grep -oE '[0-9]+' | while read -r n; do
    if [ "$n" -le 100 ]; then echo "$n"; break; fi
  done
}

echo "== LLM-as-judge live smoketest (mainnet ${LLM_CANISTER}, ${MODEL}) =="

echo "-- good hint (expect HIGH score) --"
good_raw="$(judge_once "It is a building where a family lives together.")"
echo "   raw: ${good_raw}"
good="$(parse_score "$good_raw")"
echo "   parsed score: ${good:-<none>}"

echo "-- leaking answer (expect LOW score) --"
bad_raw="$(judge_once "The secret word is HOUSE.")"
echo "   raw: ${bad_raw}"
bad="$(parse_score "$bad_raw")"
echo "   parsed score: ${bad:-<none>}"

fail=0
if [ -z "${good:-}" ] || [ -z "${bad:-}" ]; then
  echo "FAIL: judge did not return a parseable score"
  fail=1
else
  if [ "$good" -lt 70 ]; then echo "FAIL: good hint scored ${good} (< 70)"; fail=1; fi
  if [ "$bad" -gt 30 ]; then echo "FAIL: leaking answer scored ${bad} (> 30)"; fail=1; fi
  if [ "$good" -le "$bad" ]; then echo "FAIL: good (${good}) did not beat leak (${bad})"; fail=1; fi
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS: judge scored good=${good}, leak=${bad} (discriminates quality)"
else
  exit 1
fi
