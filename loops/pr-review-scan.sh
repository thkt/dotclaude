#!/usr/bin/env bash
# Scan PRs where I am a requested reviewer and emit only those that are
# new or whose head commit changed since the last recorded review.
# State key: "owner/repo#number" -> head SHA. State is written by pr-review-mark.sh,
# never here, so the loop decides when a PR counts as reviewed.
set -euo pipefail

STATE_FILE="${PR_REVIEW_STATE:-$HOME/.claude/loops/pr-review-state.json}"
LIMIT="${PR_REVIEW_LIMIT:-30}"

[[ -f "$STATE_FILE" ]] || echo '{}' >"$STATE_FILE"

prs=$(gh search prs --review-requested=@me --state=open \
  --json repository,number,title,url --limit "$LIMIT")

# For each PR, resolve head SHA, then keep only new/updated ones vs state.
echo "$prs" | jq -c '.[]' | while read -r pr; do
  repo=$(echo "$pr" | jq -r '.repository.nameWithOwner')
  num=$(echo "$pr" | jq -r '.number')
  sha=$(gh pr view "$num" --repo "$repo" --json headRefOid --jq '.headRefOid')
  key="$repo#$num"
  prev=$(jq -r --arg k "$key" '.[$k] // ""' "$STATE_FILE")
  if [[ "$sha" == "$prev" ]]; then
    continue
  fi
  reason=$([[ -z "$prev" ]] && echo new || echo updated)
  echo "$pr" | jq -c --arg sha "$sha" --arg reason "$reason" --arg key "$key" \
    '{key: $key, repo: .repository.nameWithOwner, number, title, url, sha: $sha, reason: $reason}'
done
