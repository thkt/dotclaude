#!/usr/bin/env bats
# T-048..T-051: record-bash.sh, the fast-exit wrapper in front of veto.py record bash.
# It must forward the two recordable payload shapes (gate runs / gh issue create) and exit
# without touching the store for everything else, always with status 0.

load helpers

setup() {
  common_setup
  RECORD="$BATS_TEST_DIRNAME/../record-bash.sh"
  FIX="$BATS_TEST_DIRNAME/fixtures/hook-payloads"
}

@test "T-048 a verdict-gate payload is forwarded and lands a verdict record" {
  run bash "$RECORD" < "$FIX/bash-verdict-go.json"
  [ "$status" -eq 0 ]
  grep -q '"kind":"verdict"' "$AUDIT"
}

@test "T-049 a non-matching payload fast-exits without creating the store" {
  payload='{"session_id":"S","tool_name":"Bash","tool_input":{"command":"ls -la"},"tool_response":{"stdout":"total 0"}}'
  run bash -c "printf '%s' '$payload' | bash '$RECORD'"
  [ "$status" -eq 0 ]
  [ ! -e "$VETO_HOME" ]
}

@test "T-050 a successful gh issue create is forwarded and consumes the bundle" {
  python3 "$VETO" record bash < "$FIX/bash-research-done.json"
  python3 "$VETO" record bash < "$FIX/bash-verdict-go.json"
  python3 "$VETO" record bash < "$FIX/bash-plan-ready.json"
  run bash "$RECORD" < "$FIX/bash-gh-create-success.json"
  [ "$status" -eq 0 ]
  grep -q '"kind":"consumed"' "$AUDIT"
}

@test "T-051 garbage input still exits 0 (best-effort, never blocks the hook chain)" {
  run bash -c "printf 'not json at all veto.py' | bash '$RECORD'"
  [ "$status" -eq 0 ]
}
