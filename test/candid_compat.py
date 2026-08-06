"""Normalize icp-cli's pretty-printed Candid so whitespace / line-wrapping does
not break substring or regex assertions.

icp-cli wraps records/vecs over indented lines and prints the top-level value as
``( <value> , )``. The Candid *value* is the same, so we collapse it to a single
flat line before asserting. Wraps ``icpp.smoketest.call_canister_api`` (adapted
from the tool-agnostic helper vendored in ``llms/llama_cpp_canister/test``).
"""
import re
from icpp.smoketest import call_canister_api as _raw_call_canister_api

__all__ = ["call_canister_api", "norm"]


def norm(candid_text: str) -> str:
    """Flatten icp-style multi-line Candid output to one normalized line."""
    s = re.sub(r"\s+", " ", candid_text).strip()  # collapse whitespace / wrapping
    s = re.sub(r"\s*;\s*}", " }", s)  # drop dfx's trailing `;` before `}`
    s = re.sub(r"\s*,?\s*\)$", ")", s)  # `( ... , )` -> top-level `)`
    s = re.sub(r"\(\s+", "(", s)  # `( x` -> `(x`
    s = re.sub(r"\s+\)", ")", s)  # `x )` -> `x)`
    return s


def call_canister_api(*args: object, **kwargs: object) -> str:
    """``icpp.smoketest.call_canister_api`` with the response normalized."""
    return norm(_raw_call_canister_api(*args, **kwargs))
