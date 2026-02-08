#!/bin/zsh
# PR cache for statusline: lookup current branch PR with TTL-based file cache
# Failure mode: fail-open (no PR display on error)
# Requires: gh, jq, BRANCH (set by caller)
# Output: prints PR#N hyperlink to stdout if open PR exists

command -v gh &>/dev/null && command -v jq &>/dev/null || return 0

CACHE_DIR="$HOME/.claude/cache"
CACHE_FILE="$CACHE_DIR/statusline-pr-cache.json"
CACHE_TTL_SEC="${STATUSLINE_PR_CACHE_TTL_SEC:-300}"
REPO=$(git remote get-url origin 2>/dev/null | sed -E 's#\.git$##; s#.*[:/](.*/.*)#\1#; s#.*://[^/]*/##' || true)

[ -z "$REPO" ] && return 0

CACHE_KEY="${REPO}:${BRANCH}"
NOW=$(date +%s)
HIT=""

if [ -f "$CACHE_FILE" ]; then
    CACHED_RAW=$(jq -r --arg k "$CACHE_KEY" '.[$k] // empty' "$CACHE_FILE" 2>/dev/null)
    if [ -n "$CACHED_RAW" ]; then
        IFS=$'\t' read -r CACHED_AT PR_URL PR_NUM PR_STATE \
            <<< "$(echo "$CACHED_RAW" | jq -r '[(.cached_at // 0), (.url // ""), (.number // ""), (.state // "")] | map(tostring) | @tsv' 2>/dev/null)"
        if [ $((NOW - CACHED_AT)) -lt "$CACHE_TTL_SEC" ]; then
            HIT=1
        fi
    fi
fi

if [ -z "$HIT" ]; then
    # macOS: perl is always available; coreutils timeout may not be
    PR_JSON=$(perl -e 'alarm 3; exec @ARGV' gh pr view --json url,number,state 2>/dev/null) || {
        # Do not cache failures; let next invocation retry
        return 0
    }
    IFS=$'\t' read -r PR_URL PR_NUM PR_STATE <<< "$(echo "$PR_JSON" | jq -r '[(.url // ""), (.number // ""), (.state // "")] | map(tostring) | @tsv' 2>/dev/null)"

    mkdir -p "$CACHE_DIR"
    ENTRY=$(jq -n --arg u "$PR_URL" --arg n "$PR_NUM" --arg s "$PR_STATE" --argjson t "$NOW" \
        '{url:$u, number:$n, state:$s, cached_at:$t}')
    if [ -f "$CACHE_FILE" ]; then
        EXISTING=$(cat "$CACHE_FILE")
    else
        EXISTING='{}'
    fi
    echo "$EXISTING" | jq --argjson t "$NOW" --arg k "$CACHE_KEY" --argjson v "$ENTRY" \
        '[to_entries[] | select(.value.cached_at > ($t - 86400))] | from_entries | .[$k] = $v' \
        > "$CACHE_FILE.tmp" 2>/dev/null \
        && mv "$CACHE_FILE.tmp" "$CACHE_FILE"
fi

if [ -n "$PR_NUM" ] && [ "$PR_NUM" != "null" ] && [ "$PR_STATE" = "OPEN" ]; then
    printf ' \033]8;;%s\033\\\033[93m[PR#%s]\033[0m\033]8;;\033\\' "$PR_URL" "$PR_NUM"
fi
