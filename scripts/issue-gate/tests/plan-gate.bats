#!/usr/bin/env bats
# T-009..T-012: plan-gate readiness check and fail-closed parsing.

setup() {
  SCRIPT="$BATS_TEST_DIRNAME/../plan-gate.mjs"
  FIX="$BATS_TEST_DIRNAME/fixtures/plans"
}

@test "T-009 plan-gate returns ready true for a valid plan fixture" {
  run node "$SCRIPT" --title "T" < "$FIX/valid.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ready":true'* ]]
  [[ "$output" == *'"errors":[]'* ]]
}

@test "T-010 plan-gate returns ready false with field errors for empty goal, contract, or tests" {
  run node "$SCRIPT" --title "T" < "$FIX/empty-goal.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'U-001 has an empty goal'* ]]

  run node "$SCRIPT" --title "T" < "$FIX/missing-contract.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'U-001 has an empty contract'* ]]

  run node "$SCRIPT" --title "T" < "$FIX/empty-tests.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'U-001 has no test scenario'* ]]
}

@test "T-011 plan-gate returns ready false for structural violations ported from build.js validate" {
  run node "$SCRIPT" --title "T" < "$FIX/empty-units.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'units is empty'* ]]

  run node "$SCRIPT" --title "T" < "$FIX/missing-test-command.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'test_command is empty'* ]]

  run node "$SCRIPT" --title "T" < "$FIX/dangling-depends.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'nonexistent unit'* ]]
}

@test "T-012 plan-gate malformed stdin exits nonzero (fail-closed)" {
  run node "$SCRIPT" --title "T" < "$FIX/malformed.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *'not valid JSON'* ]]
}
