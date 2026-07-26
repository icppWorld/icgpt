#!/usr/bin/env python3
"""Regenerate .env for the webpack frontend build from the icp-cli ID store.

The frontend build (webpack.config.js) reads DFX_NETWORK + CANISTER_ID_* from .env.
icp-cli tracks canister IDs per environment in .icp/data/mappings/<env>.ids.json.
This bridges the two during the dfx->icp transition: it updates DFX_NETWORK and the
app CANISTER_ID_* keys in-place, preserving every other line (NNS IDs, DFX_VERSION, ...).

Usage: python3 scripts/icp_env_write.py <env>       # env = local | production
"""
import json
import pathlib
import sys

ENV = sys.argv[1] if len(sys.argv) > 1 else "local"
NETWORK = "ic" if ENV == "production" else "local"

root = pathlib.Path(__file__).resolve().parent.parent
mapping_path = root / ".icp" / "data" / "mappings" / f"{ENV}.ids.json"
env_path = root / ".env"

ids = json.loads(mapping_path.read_text())  # { canister_name: principal }

# Desired key/value overrides for .env (single-quoted, matching the file's style).
updates = {"DFX_NETWORK": NETWORK}
for name, principal in ids.items():
    updates[f"CANISTER_ID_{name.upper()}"] = principal

lines = env_path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0].strip() if "=" in line else None
    if key in updates:
        out.append(f"{key}='{updates[key]}'")
        seen.add(key)
    else:
        out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}='{value}'")

env_path.write_text("\n".join(out) + "\n")
print(
    f"Wrote .env for env '{ENV}' (DFX_NETWORK={NETWORK}): "
    + ", ".join(f"CANISTER_ID_{n.upper()}" for n in ids)
)
