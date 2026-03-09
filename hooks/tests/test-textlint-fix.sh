#!/usr/bin/env bash
# Integration tests for textlint-fix.sh (PostToolUse hook)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$SCRIPT_DIR/../textlint-fix.sh"
PASS=0
FAIL=0
TMPDIR_BASE="$(mktemp -d)"

cleanup() { rm -rf "$TMPDIR_BASE"; }
trap cleanup EXIT

assert_eq() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local name="$1" pattern="$2" text="$3"
  if echo "$text" | grep -q "$pattern"; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (pattern '$pattern' not found)"
    FAIL=$((FAIL + 1))
  fi
}

# T-003: .md Write triggers textlint --fix
test_md_write_fixes_file() {
  echo "T-003: .md Write triggers textlint --fix"
  local tmpfile="$TMPDIR_BASE/test-write.md"
  cat > "$tmpfile" <<'EOF'
# テスト

この機能はユーザーが設定を変更することができます。また、管理者が権限を付与する事にしました。これにより、運用の効率化が期待されています。
EOF
  local json='{"tool_name":"Write","tool_input":{"file_path":"'"$tmpfile"'"}}'
  echo "$json" | bash "$HOOK" 2>/dev/null
  local content
  content=$(cat "$tmpfile")
  assert_contains "fixes redundant expression" "できます" "$content"
  assert_contains "fixes keishikimeishi" "こと" "$content"
}

# T-004: .ts file is skipped
test_ts_file_skipped() {
  echo "T-004: .ts file is skipped"
  local tmpfile="$TMPDIR_BASE/test.ts"
  echo "const x = 1;" > "$tmpfile"
  local json='{"tool_name":"Write","tool_input":{"file_path":"'"$tmpfile"'"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>&1)
  local exit_code=$?
  assert_eq "exit code 0" "0" "$exit_code"
  # File should be unchanged
  assert_eq "file unchanged" "const x = 1;" "$(cat "$tmpfile")"
}

# T-005: Read tool is skipped
test_read_tool_skipped() {
  echo "T-005: Read tool is skipped"
  local json='{"tool_name":"Read","tool_input":{"file_path":"/some/file.md"}}'
  local exit_code
  echo "$json" | bash "$HOOK" 2>/dev/null
  exit_code=$?
  assert_eq "exit code 0" "0" "$exit_code"
}

# T-009: Graceful skip when textlint not found
test_graceful_skip_no_textlint() {
  echo "T-009: Graceful skip when textlint unavailable"
  local tmpfile="$TMPDIR_BASE/test-graceful.md"
  echo "# テスト" > "$tmpfile"
  local json='{"tool_name":"Write","tool_input":{"file_path":"'"$tmpfile"'"}}'
  # Override PATH to hide bun/npx/textlint
  local exit_code=0
  echo "$json" | PATH="/usr/bin:/bin" bash "$HOOK" >/dev/null 2>&1 || exit_code=$?
  # Should not crash (exit 0)
  assert_eq "does not crash" "0" "$exit_code"
}

# T-extra: Edit tool on .md also triggers fix
test_md_edit_fixes_file() {
  echo "T-extra: Edit tool on .md triggers textlint --fix"
  local tmpfile="$TMPDIR_BASE/test-edit.md"
  cat > "$tmpfile" <<'EOF'
# テスト

この機能はユーザーが設定を変更する事にしました。また、管理者が権限を付与して運用の効率化が期待されています。
EOF
  local json='{"tool_name":"Edit","tool_input":{"file_path":"'"$tmpfile"'"}}'
  echo "$json" | bash "$HOOK" 2>/dev/null
  local content
  content=$(cat "$tmpfile")
  assert_contains "fixes keishikimeishi on Edit" "こと" "$content"
}

# T-extra: English .md file is skipped (no textlint)
test_english_md_skipped() {
  echo "T-extra: English .md file is skipped"
  local tmpfile="$TMPDIR_BASE/test-english.md"
  cat > "$tmpfile" <<'EOF'
# English Document

This is a test document written entirely in English. It should not trigger textlint processing because it does not contain enough Japanese characters.
EOF
  local original
  original=$(cat "$tmpfile")
  local json='{"tool_name":"Write","tool_input":{"file_path":"'"$tmpfile"'"}}'
  echo "$json" | bash "$HOOK" 2>/dev/null
  assert_eq "english file unchanged" "$original" "$(cat "$tmpfile")"
}

echo "=== textlint-fix.sh tests ==="
test_md_write_fixes_file
test_ts_file_skipped
test_read_tool_skipped
test_graceful_skip_no_textlint
test_md_edit_fixes_file
test_english_md_skipped

echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
