"""Staging gate smoke test: staging is for dev accounts only, always.

icgpt_admin reads its environment from the ICGPT_ENV canister environment variable
(icp.yaml). On staging, early access is always enforced (it can not be turned off),
nobody can request access, and only admins + whitelisted dev accounts are allowed.

Runs as the `--identity` test identity (a whitelisted, non-admin dev account) plus the
ops identity from .icp-identity. It temporarily removes the test identity from the
whitelist to prove a non-whitelisted account is denied, and always re-adds it.
Skipped unless the target icgpt_admin reports environment "staging":

    pytest -vv --network staging --identity icgpt-testing test/test_staging_gate.py
"""

# pylint: disable=missing-function-docstring

from pathlib import Path

import pytest

from .candid_compat import call_canister_api

ICP_YAML_PATH = Path(__file__).parent / "../icp.yaml"
CANISTER_NAME = "icgpt_admin"


def _call(network: str, method: str, arg: str = "()", identity: str = "") -> str:
    return call_canister_api(
        icp_yaml_path=ICP_YAML_PATH,
        canister_name=CANISTER_NAME,
        canister_method=method,
        canister_argument=arg,
        network=network,
        identity=identity or None,
    )


@pytest.fixture(autouse=True)
def only_on_staging(network: str) -> None:
    environment = _call(network, "getEnvironment")
    if environment != '("staging")':
        pytest.skip(f"icgpt_admin reports {environment}, not staging")


def test__early_access_can_not_be_turned_off(network: str, ops_identity: str) -> None:
    response = _call(network, "setEarlyAccess", "(false)", ops_identity)
    assert "Failed call" in response, response
    assert "early access can not be turned off" in response, response
    assert _call(network, "getEarlyAccess") == "(true)"


def test__nobody_can_request_access(network: str) -> None:
    response = _call(network, "requestAccess", '("pytest use case")')
    assert "dev accounts only" in response, response


def test__non_whitelisted_account_is_denied(
    network: str, principal: str, ops_identity: str
) -> None:
    access = _call(network, "myAccess")
    assert "isAdmin = false" in access, f"the test identity must not be an admin: {access}"
    assert "whitelisted = true" in access, (
        f"the test identity must be a whitelisted dev account: {access}"
    )
    removed = _call(
        network, "removeFromWhitelist", f'(principal "{principal}")', ops_identity
    )
    assert removed == "()", removed
    try:
        access = _call(network, "myAccess")
        assert "allowed = false" in access, access
        assert "earlyAccess = true" in access, access
    finally:
        added = _call(
            network,
            "addToWhitelist",
            f'(principal "{principal}", "", "staging dev account")',
            ops_identity,
        )
        assert added == "()", added
