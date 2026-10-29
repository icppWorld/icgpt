#!/bin/bash
# Record the deployed state of every canister in an icp environment, for the release process
# (.claude/skills/icgpt-release): module hash, status, cycles, settings and the Candid
# interface. Writes TMP-release/<env>-<UTC timestamp>/ and diffs the module hashes against the
# previous record of the same environment, so you see exactly what a deploy changed.
#
# Usage: scripts/release-record.sh <env> <identity>      (read-only: queries only)
set -euo pipefail

ENV_NAME="${1:?usage: release-record.sh <env> <identity>}"
IDENTITY="${2:?usage: release-record.sh <env> <identity>}"

ROOT="TMP-release"
PREV="$(ls -d "$ROOT/$ENV_NAME"-* 2>/dev/null | sort | tail -1 || true)"
OUT="$ROOT/$ENV_NAME-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT"

# One JSON object per line: {id, name, status, module_hash, cycles, settings, ...}
icp canister status -e "$ENV_NAME" --identity "$IDENTITY" --json > "$OUT/status.jsonl"

# name, status, deployed module hash, cycles, and the sha256 of the local build artifact
# (.icp/cache/artifacts/<name>, from the last `icp build`/deploy) - "same" when it matches the
# deployed module, so you see which canisters a release would change.
jq -r '[.name, .status, .module_hash, .cycles] | @tsv' "$OUT/status.jsonl" | sort |
  while IFS=$'\t' read -r name status hash cycles; do
    built="-"
    art=".icp/cache/artifacts/$name"
    if [ -f "$art" ]; then
      built="0x$(shasum -a 256 "$art" | cut -d' ' -f1)"
      [ "$built" = "$hash" ] && built="same"
    fi
    printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$status" "$hash" "$cycles" "$built"
  done > "$OUT/summary.tsv"

for name in $(jq -r '.name' "$OUT/status.jsonl"); do
  icp canister settings show "$name" -e "$ENV_NAME" --identity "$IDENTITY" --json \
    > "$OUT/$name.settings.json"
  # The asset canister and the LLMs expose candid:service too; tolerate a canister without it.
  icp canister metadata "$name" candid:service -e "$ENV_NAME" --identity "$IDENTITY" \
    > "$OUT/$name.did" 2>/dev/null || rm -f "$OUT/$name.did"
done

echo "Recorded $ENV_NAME -> $OUT"
{ printf 'CANISTER\tSTATUS\tDEPLOYED MODULE HASH\tCYCLES\tLOCAL BUILD\n'; cat "$OUT/summary.tsv"; } |
  column -t -s $'\t'

if [ -n "$PREV" ]; then
  echo
  echo "Module-hash changes since $PREV:"
  if diff <(cut -f1,3 "$PREV/summary.tsv") <(cut -f1,3 "$OUT/summary.tsv"); then
    echo "  (none)"
  fi
fi
