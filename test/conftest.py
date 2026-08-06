"""pytest fixtures for the ICGPT QA suite.

The ICGPT smoke tests run on the icpp-pro (>= 6.0.0) pytest harness. icpp-pro's
`icpp.conftest_base` provides the `network`, `identity` and `principal` fixtures
(plus the `--network` / `--identity` options and the `identity_anonymous`
fixture). Tests always run as the identity named by `--identity` (or
${ICPP_PRO_TEST_IDENTITY}); the machine-wide active identity is never read.

NOTE: icpp-pro's `--network` is passed to icp as `--environment`, so it takes an
icp.yaml ENVIRONMENT name. ICGPT's environments are `local` and `production`
(there is no environment literally named `ic`):

    pytest -vv --network local      --identity icgpt-testing test/test_token_counts.py
    pytest -vv --network production  --identity icpp-llm      test/test_token_counts.py

`test_judge_live.py` is the exception: it targets a raw mainnet principal (the
free DFINITY LLM canister) with `-n ic` directly, so it always hits mainnet
regardless of `--network`.
"""
# pylint: disable=unused-import, wildcard-import, unused-wildcard-import
from icpp.conftest_base import *  # noqa: F401,F403
