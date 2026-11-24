#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
HOOK="$SCRIPT_DIR/../failure-alert.sh"

TEST_TMPDIR=$(mktemp -d "${TMPDIR:-/tmp}/failure-alert-tests-XXXXXX")

SOUND_FILE="$SCRIPT_DIR/../../../sounds/DHVMagellanHorn_Heavy.mp3"
PLACEHOLDER_SOUND=""
if [[ ! -f "$SOUND_FILE" ]]; then
  mkdir -p "$(dirname "$SOUND_FILE")"
  : > "$SOUND_FILE"
  PLACEHOLDER_SOUND="$SOUND_FILE"
fi

cleanup() {
  rm -rf "$TEST_TMPDIR"
  if [[ -n "$PLACEHOLDER_SOUND" ]]; then
    rm -f "$PLACEHOLDER_SOUND"
  fi
}
trap cleanup EXIT

STUB_BIN="$TEST_TMPDIR/bin"
mkdir -p "$STUB_BIN"
printf '#!/bin/sh\nprintf "%%s\\n" "$*" >> "$AFPLAY_LOG"\n' > "$STUB_BIN/afplay"
chmod +x "$STUB_BIN/afplay"

LOG="$TEST_TMPDIR/afplay.log"

SOUND_LIMIT=100
SILENT_LIMIT=6

run_hook() {
  local action="$1" payload="${2:-}" subagent="${3:-}" limit="${4:-$SOUND_LIMIT}"
  : > "$LOG"
  printf '%s' "$payload" | (
    export PATH="$STUB_BIN:$PATH"
    export AFPLAY_LOG="$LOG"
    export CLAUDE_CODE_IS_SUBAGENT="$subagent"
    "$HOOK" "$action"
  ) 2>/dev/null
  local waited=0
  while [[ ! -s "$LOG" && $waited -lt $limit ]]; do
    sleep 0.05
    waited=$((waited + 1))
  done
  cat "$LOG"
}

silent_hook() {
  run_hook "$1" "${2:-}" "${3:-}" "$SILENT_LIMIT"
}

test_an_error_stop_sounds() {
  echo "A turn ending on anything but end_turn sounds"
  assert_contains "max_tokens" "Heavy" "$(run_hook stop '{"stop_reason":"max_tokens"}')"
}

test_a_normal_stop_is_silent() {
  echo "A clean finish stays silent"
  assert_empty "end_turn" "$(silent_hook stop '{"stop_reason":"end_turn"}')"
}

test_a_missing_stop_reason_is_silent() {
  echo "A payload with no stop_reason counts as a clean finish"
  assert_empty "no key" "$(silent_hook stop '{"session_id":"abc"}')"
}

test_a_subagent_is_silent() {
  echo "A subagent finishing is not the end of a turn"
  assert_empty "subagent" "$(silent_hook stop '{"stop_reason":"max_tokens"}' 1)"
}

test_stop_failure_always_sounds() {
  echo "StopFailure is an API error and always sounds"
  assert_contains "fail" "Heavy" "$(run_hook fail '{}')"
}

test_the_sound_file_is_named() {
  echo "The file it plays exists under sounds/"
  local named
  named=$(grep -oE 'DHVMagellanHorn_[A-Za-z]+\.mp3' "$HOOK" | head -1)
  assert_eq "the file exists" "yes" \
    "$([[ -f "$SCRIPT_DIR/../../../sounds/$named" ]] && echo yes || echo no)"
}

echo "=== failure-alert.sh tests ==="
test_an_error_stop_sounds
test_a_normal_stop_is_silent
test_a_missing_stop_reason_is_silent
test_a_subagent_is_silent
test_stop_failure_always_sounds
test_the_sound_file_is_named

report_results
