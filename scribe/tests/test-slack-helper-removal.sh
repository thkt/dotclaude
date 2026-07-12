#!/usr/bin/env bash
# U-001: lib/ の Slack token helper 削除の検証テスト (TDD Red)
# 注意: このファイルは grep 対象 (scribe/) 内に置かれるため、検索パターンの
# リテラルを本文に含めず連結で組み立てる。リテラルを書くと削除後も
# このテスト自身が一致して永久に green にならない。
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PASS=0
FAIL=0

# 自己一致を避けるため分割して連結 (= "ensure-slack" + "-token")
HELPER_NAME="ensure-slack""-token"

# T-001
test_t001() {
  local name="削除後に孤立 helper とその参照が残らない"
  local errors=()

  # then: `test ! -f lib/<helper>.sh` が真
  if [[ -f "lib/${HELPER_NAME}.sh" ]]; then
    errors+=("lib/${HELPER_NAME}.sh がまだ存在する")
  fi

  # then: `ugrep -rI <helper> scribe lib` が一致ゼロ
  local matches
  matches="$(ugrep -rI "$HELPER_NAME" scribe lib 2>/dev/null || true)"
  if [[ -n "$matches" ]]; then
    errors+=("参照が残っている (先頭3件):")
    while IFS= read -r line; do
      errors+=("  $line")
    done < <(printf '%s\n' "$matches" | head -3)
  fi

  if [[ ${#errors[@]} -eq 0 ]]; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name"
    printf '    %s\n' "${errors[@]}"
    FAIL=$((FAIL + 1))
  fi
}

test_t001

echo "---"
echo "PASS=$PASS FAIL=$FAIL"
[[ $FAIL -eq 0 ]]
