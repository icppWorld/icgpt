"""Helper functions for dfx identity"""

import sys
import subprocess

from .make import make


def get_identity() -> str:
    """Returns the current dfx identity."""
    arg = "dfx-identity-whoami "
    try:
        identity = make(arg, capture_output=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    return identity


def set_identity(identity: str) -> None:
    """Sets the dfx identity."""
    arg = f"dfx-identity-use IDENTITY={identity}"
    try:
        make(arg, capture_output=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)


def get_principal() -> str:
    """Returns the principal of the current dfx identity."""
    arg = "dfx-identity-get-principal "
    try:
        principal = make(arg, capture_output=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)

    return principal
