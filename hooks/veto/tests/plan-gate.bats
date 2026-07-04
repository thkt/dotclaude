#!/usr/bin/env bats
# T-009..T-012: plan-gate readiness check and fail-closed parsing.

load helpers

setup() {
  common_setup
  FIX="$BATS_TEST_DIRNAME/fixtures/plans"
}

plan_gate() { python3 "$VETO" plan-gate --title "T"; }

@test "T-009 plan-gate returns ready true for a valid plan fixture" {
  run plan_gate < "$FIX/valid.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ready":true'* ]]
  [[ "$output" == *'"errors":[]'* ]]
}

@test "T-010 plan-gate returns ready false with field errors for empty goal, contract, or tests" {
  run plan_gate < "$FIX/empty-goal.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'U-001 has an empty goal'* ]]

  run plan_gate < "$FIX/missing-contract.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'U-001 has an empty contract'* ]]

  run plan_gate < "$FIX/empty-tests.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'U-001 has no test scenario'* ]]
}

@test "T-011 plan-gate returns ready false for structural violations ported from build.js validate" {
  run plan_gate < "$FIX/empty-units.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'units is empty'* ]]

  run plan_gate < "$FIX/missing-test-command.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'test_command is empty'* ]]

  run plan_gate < "$FIX/dangling-depends.json"
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'nonexistent unit'* ]]
}

@test "T-012 plan-gate malformed stdin exits nonzero (fail-closed)" {
  run plan_gate < "$FIX/malformed.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *'not valid JSON'* ]]
}

# The fixture is in fixtures/plans, so the contract test also locks the build.js copy to the
# same placeholder-id rendering (units[i]) for non-object entries.
@test "T-036 plan-gate surfaces non-object units entries as per-unit errors, not a crash" {
  run plan_gate < "$FIX/non-object-units.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"ready":false'* ]]
  [[ "$output" == *'units[0] has no test scenario'* ]]
  [[ "$output" == *'units[2] has an empty goal'* ]]
  [[ "$output" != *'duplicate unit ids'* ]]
}
