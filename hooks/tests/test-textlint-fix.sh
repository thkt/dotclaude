#!/usr/bin/env bash
# Integration tests for textlint-fix.sh (PostToolUse hook)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"
HOOK="$SCRIPT_DIR/../textlint-fix.sh"
TMPDIR_BASE="$(mktemp -d)"

cleanup() { rm -rf "$TMPDIR_BASE"; }
trap cleanup EXIT

# Helper: build Bash tool_input JSON from a command string
make_bash_json() {
  local cmd="$1"
  printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' \
    "$(echo "$cmd" | sed 's/"/\\"/g')"
}

test_md_write_fixes_file() {
  echo ".md Write triggers textlint --fix"
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

test_ts_file_skipped() {
  echo ".ts file is skipped"
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

test_read_tool_skipped() {
  echo "Read tool is skipped"
  local json='{"tool_name":"Read","tool_input":{"file_path":"/some/file.md"}}'
  local exit_code
  echo "$json" | bash "$HOOK" 2>/dev/null
  exit_code=$?
  assert_eq "exit code 0" "0" "$exit_code"
}

test_graceful_skip_no_textlint() {
  echo "graceful skip when textlint unavailable"
  local tmpfile="$TMPDIR_BASE/test-graceful.md"
  echo "# テスト" > "$tmpfile"
  local json='{"tool_name":"Write","tool_input":{"file_path":"'"$tmpfile"'"}}'
  # Override PATH to hide bun/npx/textlint
  local exit_code=0
  echo "$json" | PATH="/usr/bin:/bin" bash "$HOOK" >/dev/null 2>&1 || exit_code=$?
  # Should not crash (exit 0)
  assert_eq "does not crash" "0" "$exit_code"
}

test_md_edit_fixes_file() {
  echo "Edit tool on .md triggers textlint --fix"
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

test_english_md_skipped() {
  echo "English .md file is skipped"
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

report_results
