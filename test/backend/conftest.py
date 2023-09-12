"""The pytest fixtures
   https://docs.pytest.org/en/latest/fixture.html
"""

from typing import Any, Dict, Generator
import pytest


from .scripts import network_utils
from .scripts.identity import get_identity, set_identity, get_principal


def pytest_addoption(parser: Any) -> None:
    """Adds options: `pytest --network=[local/ic] --django-url=<URL>`"""
    parser.addoption(
        "--network",
        action="store",
        default="local",
        help="The network to use: local or ic",
    )


@pytest.fixture(scope="module")
def network(request: Any) -> Any:
    """A fixture that verifies the network is up & returns the name."""
    network_ = request.config.getoption("--network")
    network_utils.check(network_)
    return network_


def handle_identity(identity: str) -> Generator[Dict[str, str], None, None]:
    """A fixture that sets the dfx identity."""
    identity_before_test = get_identity()
    set_identity(identity)
    user = {"identity": get_identity(), "principal": get_principal()}
    yield user
    set_identity(identity_before_test)


@pytest.fixture(scope="function")
def identity_anonymous() -> Generator[Dict[str, str], None, None]:
    """A fixture that sets the dfx identity to anonymous."""
    yield from handle_identity("anonymous")


@pytest.fixture(scope="function")
def identity_default() -> Generator[Dict[str, str], None, None]:
    """A fixture that sets the dfx identity to default."""
    yield from handle_identity("default")
