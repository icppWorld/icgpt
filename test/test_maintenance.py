"""Maintenance mode smoke test (icgpt_admin setMaintenance / myAccess / the gates).

While maintenance is on, a non-admin is paused: myAccess reports it, inference
(new_chat) returns status 423 with the maintenance message, and Lab saves are refused.
Admins are not paused, so a release can smoke-test production before resuming.

Runs as two identities:
  - `--identity` : a NON-admin test identity that is ALLOWED (whitelisted, or early
                   access off), eg. icgpt-testing. On local:
                   make icp-call ENV=local CANISTER_NAME=icgpt_admin CANISTER_METHOD=addToWhitelist CANISTER_ARGUMENT='(principal "<principal>", "", "pytest")'
  - ops identity : the deploy identity from .icp-identity (controller + bootstrap
                   admin), which flips maintenance on and always back off.

It PAUSES real users while it runs, so it refuses to run against production:

    pytest -vv --network local   --identity icgpt-testing test/test_maintenance.py
    pytest -vv --network staging --identity icgpt-testing test/test_maintenance.py
"""

# pylint: disable=missing-function-docstring, redefined-outer-name

from pathlib import Path
from typing import Generator

import pytest

from .candid_compat import call_canister_api

ICP_YAML_PATH = Path(__file__).parent / "../icp.yaml"
CANISTER_NAME = "icgpt_admin"
MESSAGE = "pytest maintenance check - back in a moment"
MODEL_GGUF = "gemma-3-270m-it-Q8_0.gguf"


def _call(network: str, method: str, arg: str = "()", identity: str = "") -> str:
    return call_canister_api(
        icp_yaml_path=ICP_YAML_PATH,
        canister_name=CANISTER_NAME,
        canister_method=method,
        canister_argument=arg,
        network=network,
        identity=identity or None,
    )


def _set_maintenance(network: str, ops_identity: str, on: bool, message: str) -> None:
    flag = "true" if on else "false"
    response = _call(network, "setMaintenance", f'({flag}, "{message}")', ops_identity)
    assert response == "()", response


@pytest.fixture
def maintenance_on(network: str, ops_identity: str) -> Generator[None, None, None]:
    if network == "production":
        pytest.skip("test_maintenance pauses real users - never run it against production")
    access = _call(network, "myAccess")
    assert "allowed = true" in access, (
        f"the test identity must be ALLOWED and NOT an admin: {access}"
    )
    assert "isAdmin = false" in access, access
    _set_maintenance(network, ops_identity, True, MESSAGE)
    try:
        yield
    finally:
        _set_maintenance(network, ops_identity, False, "")


def test__maintenance_pauses_non_admins(network: str, maintenance_on: None) -> None:
    del maintenance_on
    access = _call(network, "myAccess")
    assert "maintenance = true" in access, access
    assert f'maintenanceMessage = "{MESSAGE}"' in access, access

    response = _call(
        network, "new_chat", f'("{MODEL_GGUF}", record {{ args = vec {{}} }})'
    )
    assert "status_code = 423" in response, response
    assert MESSAGE in response, response

    response = _call(network, "saveLabState", '("{}")')
    assert f'err = "{MESSAGE}"' in response, response

    response = _call(network, "getMaintenance", "()")
    assert "on = true" in response, response


def test__maintenance_does_not_pause_admins(
    network: str, ops_identity: str, maintenance_on: None
) -> None:
    del maintenance_on
    access = _call(network, "myAccess", identity=ops_identity)
    assert "isAdmin = true" in access, access
    assert "allowed = true" in access, access
    # The admin reaches the LLM routing (whatever the model state), never the pause.
    response = _call(
        network,
        "new_chat",
        f'("{MODEL_GGUF}", record {{ args = vec {{}} }})',
        ops_identity,
    )
    assert MESSAGE not in response, response


def test__maintenance_off_restores_access(network: str, ops_identity: str) -> None:
    if network == "production":
        pytest.skip("test_maintenance pauses real users - never run it against production")
    _set_maintenance(network, ops_identity, False, "")
    access = _call(network, "myAccess")
    assert "maintenance = false" in access, access
