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

# --- shared helpers (U-001) ---
# frontmatter: 先頭 --- から次の --- までの本体行を出力する
frontmatter() {
  awk 'NR==1 && /^---[[:space:]]*$/ {f=1; next} f && /^---[[:space:]]*$/ {exit} f' "$1"
}
# code_blocks: fenced code block をフェンス行込みで出力する
code_blocks() {
  awk '/^```/{f=!f; print; next} f{print}' "$1"
}

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

# =====================================================================
# U-001: scribe-setup skill の JA/EN ミラー化と frontmatter 正規化の検証
# 既存 U-002 テストを拡張。SETUP.md の /scribe-setup 参照解決 (T-001) を
# guard として常時アサートし、.ja canonical の byte 一致 (T-002) と
# frontmatter 正規化 (T-003) を mirror contract に照らして検証する。
# =====================================================================

# T-001 (U-001)
test_u001_t001() {
  local name="SETUP.md の scribe-setup 参照が実在 skill に解決する"
  local errors=()
  local en="skills/scribe-setup/SKILL.md"

  # given: SETUP.md が per-repo オンボーディングとして /scribe-setup を参照している
  if ! ugrep -q scribe-setup "$SETUP"; then
    errors+=("SETUP.md が scribe-setup スキルを参照していない")
  fi

  # when/then: 参照先 skill が実在し、frontmatter name が scribe-setup と一致する
  if [[ ! -f "$en" ]]; then
    errors+=("参照先 $en が実在しない")
  else
    local nm
    nm="$(frontmatter "$en" | awk '/^name:/{print $2; exit}')"
    if [[ "$nm" != "scribe-setup" ]]; then
      errors+=("frontmatter の name が scribe-setup と一致しない (name='$nm')")
    fi
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

# T-002 (U-001)
test_u001_t002() {
  local name=".ja canonical と EN ミラーの構造リテラルが byte 一致する"
  local errors=()
  local en="skills/scribe-setup/SKILL.md"
  local ja=".ja/skills/scribe-setup/SKILL.md"

  # given: .ja canonical と EN ミラーのペアが存在する前提。不在なら byte 比較不能
  if [[ ! -f "$ja" ]]; then
    errors+=(".ja canonical ($ja) が存在しない")
  elif [[ ! -f "$en" ]]; then
    errors+=("EN ミラー ($en) が存在しない")
  else
    # when/then: name / when_to_use / fenced code block を byte 比較する
    local ja_fm en_fm ja_name en_name ja_wtu en_wtu ja_code en_code
    ja_fm="$(frontmatter "$ja")"
    en_fm="$(frontmatter "$en")"

    ja_name="$(printf '%s\n' "$ja_fm" | ugrep '^name:' || true)"
    en_name="$(printf '%s\n' "$en_fm" | ugrep '^name:' || true)"
    if [[ "$ja_name" != "$en_name" ]]; then
      errors+=("name 行が byte 一致しない (ja='$ja_name' en='$en_name')")
    fi

    ja_wtu="$(printf '%s\n' "$ja_fm" | ugrep '^when_to_use:' || true)"
    en_wtu="$(printf '%s\n' "$en_fm" | ugrep '^when_to_use:' || true)"
    if [[ "$ja_wtu" != "$en_wtu" ]]; then
      errors+=("when_to_use 行が byte 一致しない (ja='$ja_wtu' en='$en_wtu')")
    fi

    ja_code="$(code_blocks "$ja")"
    en_code="$(code_blocks "$en")"
    if [[ "$ja_code" != "$en_code" ]]; then
      errors+=("fenced code block が byte 一致しない")
    fi
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

# T-003 (U-001)
test_u001_t003() {
  local name="frontmatter が mirror contract の形に正規化されている"
  local errors=()
  local en="skills/scribe-setup/SKILL.md"

  if [[ ! -f "$en" ]]; then
    errors+=("$en が存在しない")
  else
    # when/then: when_to_use キーの存在、user-invocable キーの不在、
    #            allowed-tools の space 区切り単一行を検査する
    local fm
    fm="$(frontmatter "$en")"

    if ! printf '%s\n' "$fm" | ugrep -q '^when_to_use:'; then
      errors+=("when_to_use キーが存在しない")
    fi

    if printf '%s\n' "$fm" | ugrep -q '^user-invocable:'; then
      errors+=("user-invocable キーが存在する (mirror contract では不在)")
    fi

    if ! printf '%s\n' "$fm" | ugrep -qE '^allowed-tools:[[:space:]]+[^[:space:]]'; then
      errors+=("allowed-tools が space 区切り単一行でない (値が同一行に無い)")
    fi

    if printf '%s\n' "$fm" | ugrep -qE '^[[:space:]]+-[[:space:]]'; then
      errors+=("frontmatter に YAML list 項目が残っている (allowed-tools 未単一行化)")
    fi
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

test_t002
test_u001_t001
test_u001_t002
test_u001_t003

echo "---"
echo "PASS=$PASS FAIL=$FAIL"
[[ $FAIL -eq 0 ]]
