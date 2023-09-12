"""Helper functions to get the network status"""

import sys
import subprocess

from .make import make


def check(network: str) -> str:
    """Returns the network status."""
    arg = f"dfx-ping NETWORK={network}"
    try:
        response = make(arg, capture_output=True)
    except subprocess.CalledProcessError as e:
        print(f"The {network} network is not up!")
        sys.exit(e.returncode)

    return response
