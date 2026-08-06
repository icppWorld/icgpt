"""Exact token-accounting smoke test (Prompt Cost Lab, Phase B) through icgpt_admin.

llama_cpp_canister >= v0.15.0 returns five `opt nat64` counts on each run_update:

    n_prompt_tokens            total prompt tokens presented this call
    n_prompt_tokens_cached     prompt-cache prefix hit  (= the cache-break offset)
    n_prompt_tokens_decoded    prompt tokens actually decoded this call
    n_tokens_generated         tokens generated this call
    n_prompt_tokens_remaining  prompt suffix left for the next call

icgpt_admin flows them through `xify` (LlmTypes.RunOutputRecordX), and the on-chain
Prompt Cost Lab reads them to show EXACT (not estimated) cache-break attribution.
This proves the whole path decodes + reconciles, and demonstrates the core Lab
property: on a WARM re-send the entire prefix is reused for free (cached == total,
decoded == 0).

It sends the SAME prompt twice WITHOUT a new_chat between (so llama.cpp's prompt-cache
prefix-match kicks in) and asserts:
  COLD: cached < total, decoded > 0, cached + decoded + remaining == total
  WARM: cached == total, decoded == 0, and cached > the COLD cached

PRECONDITION: an icgpt_admin (in the target env) with a registered llama canister
whose model is LOADED. After any llama `--mode upgrade` the model must be re-loaded
(load_model + set_max_tokens) — an upgrade preserves the gguf but resets the loaded
model. Locally, deploy + load a model first (default gemma). Against mainnet, run as
an admin identity (the early-access gate lets admins call new_chat/run_update):

    pytest -vv --network local      --identity icgpt-testing test/test_token_counts.py
    pytest -vv --network production  --identity icpp-llm      test/test_token_counts.py

The model gguf defaults to gemma; override with ${ICGPT_TEST_MODEL_GGUF}. Migrated
from scripts/smoketest_token_counts.sh.
"""

# pylint: disable=missing-function-docstring, line-too-long

import os
import re
import uuid
from pathlib import Path

from .candid_compat import call_canister_api

ICP_YAML_PATH = Path(__file__).parent / "../icp.yaml"
CANISTER_NAME = "icgpt_admin"
MODEL_GGUF = os.environ.get("ICGPT_TEST_MODEL_GGUF", "gemma-3-270m-it-Q8_0.gguf")

FIELDS = (
    "n_prompt_tokens",
    "n_prompt_tokens_cached",
    "n_prompt_tokens_decoded",
    "n_tokens_generated",
    "n_prompt_tokens_remaining",
)

# icgpt_admin rewrites --prompt-cache to a per-CALLER path (unspoofable), so a
# caller's prompt cache survives new_chat. A per-run nonce guarantees a genuinely
# COLD first call (this exact prefix is in no prior cache); the WARM call re-sends
# the identical nonced prompt, so its whole prefix is a cache hit.
_NONCE = uuid.uuid4().hex[:8]
_PROMPT = f"{_NONCE} the quick brown fox jumps over the lazy dog and then runs far away into the woods"
_CACHE_ARGS = [
    "--prompt-cache",
    "my_cache/prompt.cache",
    "--prompt-cache-all",
    "--cache-type-k",
    "q8_0",
    "--cache-type-v",
    "q8_0",
]


def _vec(items: list) -> str:
    return "vec { " + "; ".join(f'"{s}"' for s in items) + " }"


def _call(network: str, method: str, arg: str) -> str:
    return call_canister_api(
        icp_yaml_path=ICP_YAML_PATH,
        canister_name=CANISTER_NAME,
        canister_method=method,
        canister_argument=arg,
        network=network,
    )


def _new_chat(network: str) -> str:
    return _call(network, "new_chat", f'("{MODEL_GGUF}", record {{ args = {_vec(_CACHE_ARGS)} }})')


def _run(network: str) -> str:
    args = _CACHE_ARGS + ["-sp", "-p", _PROMPT, "-n", "1"]
    return _call(network, "run_update", f"(record {{ args = {_vec(args)} }})")


def _nat(response: str, name: str) -> int:
    """Extract a `name = opt (N : nat64)` field (a `null` here fails the test)."""
    match = re.search(rf"{name} = opt \(([\d_]+) : nat64\)", response)
    assert match, (
        f"{name} is missing or null in: {response}\n"
        "(is the model loaded and the llama wasm >= v0.15.0?)"
    )
    return int(match.group(1).replace("_", ""))


def _tokens(response: str) -> dict:
    assert "Ok" in response, response
    return {name: _nat(response, name) for name in FIELDS}


def _reconciles(t: dict) -> None:
    assert (
        t["n_prompt_tokens_cached"]
        + t["n_prompt_tokens_decoded"]
        + t["n_prompt_tokens_remaining"]
        == t["n_prompt_tokens"]
    ), t


def test__exact_counts_cold_then_warm_cache_break(network: str) -> None:
    assert "Ok" in _new_chat(network), "new_chat did not return Ok"

    # COLD: a novel nonced prefix does real ingestion — most of it is NOT cached.
    # (Not strictly 0: the leading BOS/special token can match any prior cache, so
    # assert cached < total rather than cached == 0.)
    cold = _tokens(_run(network))
    _reconciles(cold)
    assert cold["n_prompt_tokens"] > 0, cold
    assert cold["n_prompt_tokens_cached"] < cold["n_prompt_tokens"], cold
    assert cold["n_prompt_tokens_decoded"] > 0, cold

    # WARM: re-sending the identical prompt (no new_chat between) reuses the ENTIRE
    # prefix for free — this is the Prompt Cost Lab's cache-break-offset property.
    warm = _tokens(_run(network))
    _reconciles(warm)
    assert warm["n_prompt_tokens_cached"] == warm["n_prompt_tokens"], warm
    assert warm["n_prompt_tokens_decoded"] == 0, warm
    assert warm["n_prompt_tokens_cached"] > cold["n_prompt_tokens_cached"], (cold, warm)
