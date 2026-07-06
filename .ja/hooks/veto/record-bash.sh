#!/usr/bin/env bash
# PostToolUse recorder (bash) の fast-exit ラッパー。recorder が記録しうる 2 種の payload、
# gate 実行 (veto.py token) と gh issue create (consumed 記録) だけ recorder へ転送し、それ以外は
# python3 を起動せず即終了する。plugin hook として常時発火しても、全 Bash 呼び出しに python
# 起動コストを払わないための層。記録するかどうかの精密判定は veto.py record bash が持つ
# (該当しない payload は silent no-op)。
#
# recorder は best-effort なので gate と違い fail-closed にしない。python3 不在やエラーは記録なしで
# 素通しし、stderr は record.log に残して後から root-cause できるようにする。
input="$(cat)"
case "$input" in
  *veto.py* | *gh*issue*create*) ;;
  *) exit 0 ;;
esac

command -v python3 >/dev/null 2>&1 || exit 0

DIR="$(cd "${BASH_SOURCE[0]%/*}" && pwd)"
LOG_DIR="${VETO_HOME:-$HOME/.claude/state/veto}"
# shellcheck disable=SC2174  # -m は leaf にだけ効けばよい: leaf が store dir そのもの
mkdir -p -m 700 "$LOG_DIR" 2>/dev/null || true
printf '%s' "$input" | python3 "$DIR/veto.py" record bash 2>>"$LOG_DIR/record.log" || true
exit 0
