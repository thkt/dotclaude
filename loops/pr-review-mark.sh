#!/usr/bin/env bash
# Record that a PR's head SHA has been reviewed (draft presented to the human).
# Call after the loop has produced and shown a review for this commit, so the
# next scan skips it until a new commit arrives.
# Usage: pr-review-mark.sh <owner/repo#number> <sha>
set -euo pipefail

STATE_FILE="${PR_REVIEW_STATE:-$HOME/.claude/loops/pr-review-state.json}"
key="${1:?usage: pr-review-mark.sh <owner/repo#number> <sha>}"
sha="${2:?usage: pr-review-mark.sh <owner/repo#number> <sha>}"

[[ -f "$STATE_FILE" ]] || echo '{}' >"$STATE_FILE"

tmp=$(mktemp)
jq --arg k "$key" --arg s "$sha" '.[$k] = $s' "$STATE_FILE" >"$tmp"
mv "$tmp" "$STATE_FILE"
echo "marked $key -> $sha"
