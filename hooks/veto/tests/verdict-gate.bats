#!/usr/bin/env bats
# T-001..T-008: verdict-gate one-way GO -> NO-GO downgrade and fail-closed parsing.

load helpers

setup() {
  common_setup
  FIX="$BATS_TEST_DIRNAME/fixtures/verdicts"
}

verdict_gate() { python3 "$VETO" verdict-gate --title "${1:-T}"; }

@test "T-001 GO with 7 assumptions remains GO at the GATE_MAX_ASSUMPTIONS boundary" {
  run verdict_gate < "$FIX/go-7-assumptions.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"verdict":"GO"'* ]]
  [[ "$output" == *'"downgraded":false'* ]]
}

@test "T-002 GO with 8 assumptions downgrades to NO-GO with max-assumptions reason" {
  run verdict_gate < "$FIX/go-8-assumptions.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"verdict":"NO-GO"'* ]]
  [[ "$output" == *'max-assumptions'* ]]
}

@test "T-003 GO with an irreversible assumption downgrades to NO-GO" {
  run verdict_gate < "$FIX/go-irreversible.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"verdict":"NO-GO"'* ]]
  [[ "$output" == *'irreversible-assumption'* ]]
}

@test "T-004 GO with an underspecified assumption downgrades to NO-GO" {
  run verdict_gate < "$FIX/go-underspecified.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"verdict":"NO-GO"'* ]]
  [[ "$output" == *'underspecified'* ]]
}

@test "T-005 NO-GO input is never upgraded (one-way downgrade rule)" {
  run verdict_gate < "$FIX/no-go.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"verdict":"NO-GO"'* ]]
  [[ "$output" == *'"downgraded":false'* ]]
}

@test "T-006 malformed stdin JSON exits nonzero with reason on stderr (fail-closed)" {
  run verdict_gate < "$FIX/malformed.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *'not valid JSON'* ]]
  [[ "$output" != *'GO'* ]]
}

@test "T-007 schema-invalid input missing verdict field exits nonzero" {
  run verdict_gate < "$FIX/missing-verdict.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *'VERDICT_SCHEMA'* ]]
}

@test "T-037 GO with a non-object assumptions entry returns GO plus a visible warning" {
  run verdict_gate <<< '{"verdict":"GO","assumptions":["x"]}'
  [ "$status" -eq 0 ]
  [[ "$output" == *'"verdict":"GO"'* ]]
  [[ "$output" == *'"downgraded":false'* ]]
  [[ "$output" == *'assumptions[0] is not an object'* ]]
}

@test "T-008 normalized_title applies trim and whitespace collapse" {
  run verdict_gate "  A   B  " <<< '{"verdict":"GO","assumptions":[]}'
  [ "$status" -eq 0 ]
  [[ "$output" == *'"normalized_title":"A B"'* ]]
}
