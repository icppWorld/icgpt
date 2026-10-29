#!/bin/bash
# Upgrade-safety gate for icgpt_admin, run BEFORE deploying to an environment
# (.claude/skills/icgpt-release). Compares the canister that is actually deployed in <env>
# with the working tree:
#   1. Motoko stable state: the deployed `motoko:stable-types` metadata vs the new build's
#      stable signature, with `moc --stable-compatible` (an incompatible upgrade would trap
#      and be rolled back - this catches it before maintenance is switched on).
#   2. Candid interface: the deployed `candid:service` vs the new .did, with
#      `didc check` (the new service must be a subtype: old frontends / callers keep working).
#
# Usage: scripts/release-stable-check.sh <env> <identity>      (read-only: queries only)
set -euo pipefail

ENV_NAME="${1:?usage: release-stable-check.sh <env> <identity>}"
IDENTITY="${2:?usage: release-stable-check.sh <env> <identity>}"
CANISTER="icgpt_admin"
MAIN="src/backend/main.mo"

# The moc pinned in mops.toml, from the mops cache (macOS or Linux location).
MOC_VERSION="$(awk -F'"' '/^moc *=/ {print $2; exit}' mops.toml)"
MOC=""
for dir in "$HOME/Library/Caches/mops/moc/$MOC_VERSION" "$HOME/.cache/mops/moc/$MOC_VERSION"; do
  [ -x "$dir/moc" ] && MOC="$dir/moc" && break
done
[ -n "$MOC" ] || { echo "moc $MOC_VERSION not found in the mops cache - run: mops install"; exit 1; }

OUT="TMP-release/stable-check-$ENV_NAME"
rm -rf "$OUT" && mkdir -p "$OUT"

icp canister metadata "$CANISTER" motoko:stable-types -e "$ENV_NAME" --identity "$IDENTITY" > "$OUT/deployed.most"
icp canister metadata "$CANISTER" candid:service -e "$ENV_NAME" --identity "$IDENTITY" > "$OUT/deployed.did"

# shellcheck disable=SC2046  # mops sources prints space-separated --package flags
"$MOC" $(mops sources) --stable-types --idl -o "$OUT/new.wasm" "$MAIN" 2> "$OUT/moc.log" ||
  { cat "$OUT/moc.log"; exit 1; }

echo "== Motoko stable state ($ENV_NAME deployed -> working tree)"
"$MOC" --stable-compatible "$OUT/deployed.most" "$OUT/new.most"
echo "   compatible"
diff <(grep -E '^ +stable ' "$OUT/deployed.most" | sort) <(grep -E '^ +stable ' "$OUT/new.most" | sort) |
  sed 's/^/   /' || true

echo "== Candid interface ($ENV_NAME deployed -> working tree)"
command -v didc >/dev/null || { echo "didc not found - install it from https://github.com/dfinity/candid/releases"; exit 1; }
didc check "$OUT/new.did" "$OUT/deployed.did"
echo "   compatible"
