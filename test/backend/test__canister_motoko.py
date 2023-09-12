"""Unit Tests for canister_motoko deployed to either local or ic network

We use pytest, with a custom fixture for the network to use.

We can debug this file directly in our IDE:
    (-) by default, it will use the local network
    (-) to use the IC network, specify as argument: `--network=ic`

We can run with `pytest`, from root directory:

    $ pytest --network=[local/ic] test/backend/test__canister_motoko.py
    (-) Default: network=local

We can run with `make`, as done in the cicd.yml:

    $ make smoketest NETWORK=[local/ic] CANISTER_NAME=canister_motoko
    (-) Default: NETWORK=local

"""
# pylint: disable=missing-function-docstring

import pytest  # pylint: disable=unused-import
from .scripts.smoketest import smoketest
from .scripts import candid


CANISTER_NAME = "canister_motoko"


def test__greet(network: str) -> None:
    d = {"name": "T. Ester"}
    text_in = candid.dict_to_text(d)
    _response = smoketest(
        canister_name=CANISTER_NAME,
        canister_method="greet",
        canister_argument=text_in,
        network=network,
        expected_response='("Hello, {\\"name\\": \\"T. Ester\\"}! from a Motoko backend canister.")\n',  # pylint: disable=line-too-long
    )


def test__greet__negative(network: str) -> None:
    """Verify that api traps when it receives a wrong message"""
    # call it without a canister_argument, which is wrong
    with pytest.raises(SystemExit):
        smoketest(canister_name=CANISTER_NAME, canister_method="greet", network=network)
