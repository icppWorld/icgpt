"""Live LLM-as-judge smoke test (Prompt Cost Lab, Phase C).

The judge scores a reply 0..100 against a rubric using the FREE DFINITY LLM
canister (Qwen3-32B, w36hm-eqaaa-aaaal-qr76a-cai). This validates that call
END-TO-END against the real model (never mocked), exercising the exact request
shape mo:llm produces from icgpt_admin's `judge`:
  - variant { system = record { content = <rubric + "reply with only an integer"> } }
  - variant { user   = record { content = <the answer> } }
and the exact response shape it parses ( record { message = record { content = opt text } } ).

It asserts the model DISCRIMINATES quality: a good, non-leaking hint scores high
and a blatant leak scores low. The deterministic wrapping / parsing / averaging
around this call is unit-tested separately in test/Judge.test.mo (`mops test`).

A LOCAL replica cannot reach a mainnet canister, so this test always targets
mainnet (`-n ic`). The free model attaches 0 cycles, so it costs nothing. It is
independent of `--network` (which only decides the local-vs-mainnet check the
harness runs at startup). Migrated from scripts/smoketest_judge_live.sh.

    pytest -vv --network ic --identity icgpt-testing test/test_judge_live.py
"""

# pylint: disable=missing-function-docstring, line-too-long

import re

from icpp.run_shell_cmd import run_shell_cmd

LLM_CANISTER = "w36hm-eqaaa-aaaal-qr76a-cai"
MODEL = "qwen3:32b"
RUBRIC = "A good one-sentence hint about the secret word HOUSE that never contains the word HOUSE."
# The `\n` below are literal backslash-n in the Candid text; the model sees newlines.
SYS = (
    "You are a strict evaluator. Score how well the ANSWER satisfies the RUBRIC on a "
    "scale from 0 to 100, where 0 is total failure and 100 is perfect. Respond with ONLY "
    "a single integer between 0 and 100 - no words, no punctuation, no explanation.\\n"
    f"RUBRIC:\\n{RUBRIC}"
)


def _judge_once(identity: str, answer: str) -> str:
    """Call the live model's v1_chat and return the raw Candid response."""
    arg = (
        f'(record {{ model = "{MODEL}"; messages = vec {{ '
        f'variant {{ system = record {{ content = "{SYS}" }} }}; '
        f'variant {{ user = record {{ content = "ANSWER:\\n{answer}" }} }}; '
        f"}}; tools = null }})"
    )
    return run_shell_cmd(
        f"icp canister call {LLM_CANISTER} v1_chat '{arg}' -n ic --identity {identity}",
        capture_output=True,
        timeout_seconds=120,
    )


def _parse_score(raw: str):
    """First integer in [0, 100] in the model output (mirrors Judge.parseScore)."""
    for n in re.findall(r"\d+", raw):
        if int(n) <= 100:
            return int(n)
    return None


def test__judge_discriminates_quality(identity: str) -> None:
    good = _parse_score(_judge_once(identity, "It is a building where a family lives together."))
    leak = _parse_score(_judge_once(identity, "The secret word is HOUSE."))

    assert good is not None and leak is not None, f"judge returned no parseable score (good={good}, leak={leak})"
    assert good >= 70, f"good hint scored {good} (< 70)"
    assert leak <= 30, f"leaking answer scored {leak} (> 30)"
    assert good > leak, f"good ({good}) did not beat leak ({leak})"
