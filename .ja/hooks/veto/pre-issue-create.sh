#!/usr/bin/env bash
# `gh issue create` の PreToolUse gate。それ以外は fast-exit。fail-closed: python3 不在や
# gate のエラー時は deny。それ以外の allow / deny 判定は `veto.py gate` が持つ。
#
# case matcher は意図的に loose: gh / issue / create の token が散在する Bash payload
# (ファイルパスやフレーズを引用したコミットメッセージ) も転送する。false positive 削減の
# ために連続フレーズへ tighten しない -- tighten した glob が取りこぼす本物の create は
# gate を素通りする (bypass であり false positive より悪い)。create の精密判定は veto.py
# (is_gh_issue_create) が持ち、非 create は deny せず素通しする。
input="$(cat)"
case "$input" in
  *'"tool_name":"Bash"'*gh*issue*create*) ;;
  *) exit 0 ;;
esac

DENY='{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"veto: python3 unavailable or gate errored, cannot verify evidence (fail-closed)"}}'
command -v python3 >/dev/null 2>&1 || { printf '%s\n' "$DENY"; exit 0; }

DIR="$(cd "${BASH_SOURCE[0]%/*}" && pwd)"
# stderr は UI に出さず gate.log に捕捉する。恒常的な false-deny (コードのバグ、store の
# permission エラー) を事後に根本原因まで追えるようにするため。log dir が作れなければ
# redirect が失敗しコマンドが失敗して、下の汎用 DENY が fail-closed を維持する。
# -m 700 はどちらのコンポーネントが先に作っても store dir を owner-only に保つ (veto.py は 0o700)。
LOG_DIR="${VETO_HOME:-$HOME/.claude/state/veto}"
# shellcheck disable=SC2174  # -m が leaf にだけ効くのは意図どおり: leaf こそが store dir で、
# 親 (~/.claude/state) は secret を持たない。Python の mkdir(mode=0o700) も同じ挙動。
mkdir -p -m 700 "$LOG_DIR" 2>/dev/null || true
out="$(printf '%s' "$input" | python3 "$DIR/veto.py" gate 2>>"$LOG_DIR/gate.log")" || { printf '%s\n' "$DENY"; exit 0; }
printf '%s' "$out"
exit 0
