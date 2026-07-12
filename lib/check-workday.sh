#!/bin/bash
# 平日判定（JST 基準）。週末・祝日なら exit 1、平日なら exit 0。
# Usage: lib/check-workday.sh [LOG_DIR]
#   LOG_DIR が指定されていれば skipped.log にスキップ理由を記録。
set -euo pipefail

LOG_DIR="${1:-}"
TODAY=$(TZ=Asia/Tokyo date +%Y-%m-%d)

log_skip() {
  if [ -n "$LOG_DIR" ]; then
    echo "$TODAY $1: skipped" >> "$LOG_DIR/skipped.log"
  fi
}

# 週末チェック（1=月 ... 5=金, 6=土, 7=日）
DOW=$(TZ=Asia/Tokyo date +%u)
if [ "$DOW" -gt 5 ]; then
  log_skip "Weekend"
  exit 1
fi

# 日本の祝日チェック（日次キャッシュ。API 失敗時は平日扱いで続行）
CACHE="/tmp/holidays-jp-${TODAY}.json"
if [ ! -f "$CACHE" ]; then
  curl -sf --connect-timeout 3 --max-time 10 "https://holidays-jp.github.io/api/v1/date.json" > "$CACHE" 2>/dev/null || rm -f "$CACHE"
fi
if [ -f "$CACHE" ] && grep -qF "\"$TODAY\"" "$CACHE"; then
  log_skip "Holiday"
  exit 1
fi

exit 0
