#!/usr/bin/env bats
# T-013..T-016: conformance of the challenge / think / research skills to the issue-gate
# contract. Greps the SKILL.md files (JA canonical + EN mirror) for the required wiring so a
# future edit that drops the gate call, the node permission, the foreground spawn, or the JSON
# output contract fails here.

setup() {
  ROOT="$BATS_TEST_DIRNAME/../../.."
}

# assert_contains FILE FIXED_STRING
assert_contains() {
  local file="$1" needle="$2"
  [ -f "$file" ] || { echo "missing file: $file"; return 1; }
  grep -qF -- "$needle" "$file" || { echo "in $file, expected to find: $needle"; return 1; }
}

@test "T-013 challenge invokes verdict-gate and requires a verbatim title (JA + EN)" {
  for f in "$ROOT/.ja/skills/challenge/SKILL.md" "$ROOT/skills/challenge/SKILL.md"; do
    assert_contains "$f" "verdict-gate.mjs --title"
    assert_contains "$f" "verbatim"
  done
}

@test "T-014 restored think and research allowed-tools include Bash(node:*) (JA + EN)" {
  for f in \
    "$ROOT/.ja/skills/think/SKILL.md" "$ROOT/skills/think/SKILL.md" \
    "$ROOT/.ja/skills/research/SKILL.md" "$ROOT/skills/research/SKILL.md"; do
    assert_contains "$f" "Bash(node:*)"
  done
}

@test "T-015 evidence-target spawns specify run_in_background: false in all three skills (JA + EN)" {
  for f in \
    "$ROOT/.ja/skills/challenge/SKILL.md" "$ROOT/skills/challenge/SKILL.md" \
    "$ROOT/.ja/skills/think/SKILL.md" "$ROOT/skills/think/SKILL.md" \
    "$ROOT/.ja/skills/research/SKILL.md" "$ROOT/skills/research/SKILL.md"; do
    assert_contains "$f" "run_in_background: false"
  done
}

@test "T-016 critic and explorer spawns specify a parseable JSON output contract (JA + EN)" {
  # critic-design output: VERDICT_SCHEMA-equivalent verdict field in challenge and think
  for f in \
    "$ROOT/.ja/skills/challenge/SKILL.md" "$ROOT/skills/challenge/SKILL.md" \
    "$ROOT/.ja/skills/think/SKILL.md" "$ROOT/skills/think/SKILL.md"; do
    assert_contains "$f" 'verdict: "GO" | "NO-GO"'
  done
  # think plan output: PLAN_SCHEMA-equivalent, piped to plan-gate
  for f in "$ROOT/.ja/skills/think/SKILL.md" "$ROOT/skills/think/SKILL.md"; do
    assert_contains "$f" "PLAN_SCHEMA"
    assert_contains "$f" "plan-gate.mjs --title"
  done
  # explorer-feature output: findings contract in research
  for f in "$ROOT/.ja/skills/research/SKILL.md" "$ROOT/skills/research/SKILL.md"; do
    assert_contains "$f" "findings:"
  done
}
