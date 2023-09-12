"""Smoketest"""

import sys
import subprocess
from typing import Optional
import pytest  # pylint: disable=unused-import
from .make import make


def smoketest(
    *,
    canister_name: str,
    canister_method: str,
    canister_argument: Optional[str] = None,
    canister_input: str = "idl",
    canister_output: str = "idl",
    network: str = "local",
    expected_response: Optional[str] = None,
    expected_response_startswith: Optional[str] = None,
) -> str:
    """Runs a smoketest for a canister"""

    arg = (
        f"dfx-canister-call "
        f"NETWORK={network} "
        f"CANISTER_INPUT={canister_input} "
        f"CANISTER_OUTPUT={canister_output} "
        f"CANISTER_NAME={canister_name} "
        f"CANISTER_METHOD={canister_method} "
    )

    if canister_argument is None:
        arg += 'CANISTER_ARGUMENT="()" '
    else:
        arg += f"CANISTER_ARGUMENT={canister_argument} "
    try:
        response = make(arg, capture_output=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    if expected_response:
        assert response == expected_response
    if expected_response_startswith:
        assert response.startswith(expected_response_startswith)

    return response
