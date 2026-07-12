#!/usr/bin/env bash
# U-002: SETUP.md の skill 重複除去と構成説明の実体一致の検証テスト (TDD Red)
# シナリオの then (scribe-setup 有 / SCAN_ROOTS 無 / check-workday 有) は
# 出発状態のドリフトにより既に成立するため、contract の観測可能条件
# (重複コマンドブロックの除去、構成 table への check-workday 帰属) も検証する。
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

SETUP="scribe/SETUP.md"
PASS=0
FAIL=0

# T-002
test_t002() {
  local name="重複が消え、構成説明が実体と一致する"
  local errors=()

  # then (シナリオ字義): `ugrep -q scribe-setup scribe/SETUP.md` が真
  if ! ugrep -q scribe-setup "$SETUP"; then
    errors+=("per-repo オンボーディングが /scribe-setup skill を指していない")
  fi

  # then (シナリオ字義): `ugrep -qw SCAN_ROOTS scribe/SETUP.md` が偽
  if ugrep -qw SCAN_ROOTS "$SETUP"; then
    errors+=("存在しない SCAN_ROOTS を参照している")
  fi

  # then (シナリオ字義): `ugrep -q check-workday scribe/SETUP.md` が真
  if ! ugrep -q check-workday "$SETUP"; then
    errors+=("平日判定の実体 check-workday.sh への言及が無い")
  fi

  # contract (1) 重複除去: skill とバイト一致の手動手順コマンドが SETUP.md に残らない
  if ugrep -qF 'cp ~/.claude/scribe/wiki-readme.template.md' "$SETUP"; then
    errors+=("wiki-readme.template.md の cp 手順が skill と重複したまま残っている")
  fi
  if ugrep -qF 'gh label create scribe' "$SETUP"; then
    errors+=("gh label create の手順が skill と重複したまま残っている")
  fi

  # contract (2) 構成の補正: 構成 table に check-workday.sh の行があり、
  # 平日判定が run.sh でなく check-workday.sh に帰属している
  local kosei_section
  kosei_section="$(awk '/^## 構成/{f=1;next} /^## /{f=0} f' "$SETUP")"
  if ! printf '%s\n' "$kosei_section" | ugrep -q check-workday; then
    errors+=("構成 table に外部依存 check-workday.sh の行が無い")
  fi
  local heijitsu_lines
  heijitsu_lines="$(printf '%s\n' "$kosei_section" | ugrep '平日判定' || true)"
  if [[ -n "$heijitsu_lines" ]] && printf '%s\n' "$heijitsu_lines" | ugrep -qv check-workday; then
    errors+=("構成 table の平日判定が check-workday.sh 以外に帰属している")
  fi

  # contract (2) 正直な説明: 「自己完結」とは書かない
  if ugrep -q '自己完結' "$SETUP"; then
    errors+=("自己完結と記述している (外部依存 check-workday.sh / gh / codex がある)")
  fi

  # contract (1) 固有節の保全: 構成 / stateless / 実行 / launchd / 承認 は残る
  local marker
  for marker in '## 構成' '## 実行' 'launchd' '## 承認フロー' 'state ファイル'; do
    if ! ugrep -qF "$marker" "$SETUP"; then
      errors+=("SETUP.md 固有の記述が失われている: $marker")
    fi
  done

  if [[ ${#errors[@]} -eq 0 ]]; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name"
    printf '    %s\n' "${errors[@]}"
    FAIL=$((FAIL + 1))
  fi
}

test_t002

echo "---"
echo "PASS=$PASS FAIL=$FAIL"
[[ $FAIL -eq 0 ]]
