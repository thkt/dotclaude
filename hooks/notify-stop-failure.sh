#!/bin/zsh
# StopFailure hook: notify when turn ends due to API error
# (rate limit, auth failure, etc.)
set +e

command -v jq &>/dev/null || exit 0
source "$HOME/.claude/hooks/lib/notify.sh"

play_sound "DHVMagellanHorn_Heavy.mp3"

exit 0
