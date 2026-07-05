#!/usr/bin/env bats
# T-043..T-046: the research-gate presence check. Declares a saved research output exists
# (non-empty) bound to a title; the recorder turns its stdout into a research evidence record.

load helpers

setup() {
  common_setup
  RESEARCH="$BATS_TEST_TMPDIR/research.md"
  printf '# research output\n' > "$RESEARCH"
}

@test "T-043 an existing non-empty research file reports done with the normalized title" {
  run python3 "$VETO" research-gate --title "  [Feature]   ゲート付き issue 作成フロー " --file "$RESEARCH"
  [ "$status" -eq 0 ]
  [[ "$output" == *'"done":true'* ]]
  [[ "$output" == *'"normalized_title":"[Feature] ゲート付き issue 作成フロー"'* ]]
}

@test "T-044 a missing research file exits 1 with no stdout (fail-closed)" {
  run python3 "$VETO" research-gate --title "t" --file "$BATS_TEST_TMPDIR/nonexistent.md"
  [ "$status" -eq 1 ]
  [[ "$output" == *'not found or empty'* ]]
  [[ "$output" != *'"done":true'* ]]
}

@test "T-045 an empty research file exits 1 (fail-closed)" {
  : > "$RESEARCH"
  run python3 "$VETO" research-gate --title "t" --file "$RESEARCH"
  [ "$status" -eq 1 ]
  [[ "$output" == *'not found or empty'* ]]
}

@test "T-046 a missing --file flag exits 1" {
  run python3 "$VETO" research-gate --title "t"
  [ "$status" -eq 1 ]
  [[ "$output" == *'--file'* ]]
}
