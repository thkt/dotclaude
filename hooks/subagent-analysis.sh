#!/bin/bash

# SubagentStop Hook Script
# 目的: サブエージェント実行ログを自動保存
# Version 2.0.42の新機能: agent_id と agent_transcript_path フィールドを活用

# ログディレクトリ設定
LOG_DIR="$HOME/.claude/logs/agents"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# 標準入力からJSONを読み取り
INPUT=$(cat)

# JSONからagent_idとagent_transcript_pathを抽出
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.agent_transcript_path // ""')

# デバッグ用: 入力JSONをログに保存（オプション）
# echo "$INPUT" > "$LOG_DIR/debug-${TIMESTAMP}.json"

# トランスクリプトパスが存在し、ファイルが読み取り可能な場合
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # エージェントID別のディレクトリ作成
  AGENT_LOG_DIR="$LOG_DIR/$AGENT_ID"
  mkdir -p -m 700 "$AGENT_LOG_DIR"

  # トランスクリプト全体をコピー（タイムスタンプ付き）
  FULL_LOG="$AGENT_LOG_DIR/full-${TIMESTAMP}.json"
  cp "$TRANSCRIPT_PATH" "$FULL_LOG"
  chmod 600 "$FULL_LOG"

  # 要約版を作成（最後の100行のみ）
  SUMMARY_LOG="$AGENT_LOG_DIR/summary-${TIMESTAMP}.json"
  tail -100 "$TRANSCRIPT_PATH" > "$SUMMARY_LOG"
  chmod 600 "$SUMMARY_LOG"

  # 最新のログへのシンボリックリンク更新
  ln -sf "$FULL_LOG" "$AGENT_LOG_DIR/latest-full.json"
  ln -sf "$SUMMARY_LOG" "$AGENT_LOG_DIR/latest-summary.json"

  # 統計情報を記録
  LINE_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
  FILE_SIZE=$(stat -f%z "$TRANSCRIPT_PATH" 2>/dev/null || stat -c%s "$TRANSCRIPT_PATH" 2>/dev/null || echo "unknown")

  # メタデータファイル作成
  META_LOG="$AGENT_LOG_DIR/meta-${TIMESTAMP}.json"
  cat > "$META_LOG" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "agent_id": "$AGENT_ID",
  "transcript_path": "$TRANSCRIPT_PATH",
  "line_count": $LINE_COUNT,
  "file_size_bytes": $FILE_SIZE,
  "log_files": {
    "full": "$FULL_LOG",
    "summary": "$SUMMARY_LOG"
  }
}
EOF
  chmod 600 "$META_LOG"

  # 古いログを削除（30日以上前のものを削除）
  find "$AGENT_LOG_DIR" -name "full-*.json" -mtime +30 -delete 2>/dev/null
  find "$AGENT_LOG_DIR" -name "summary-*.json" -mtime +30 -delete 2>/dev/null
  find "$AGENT_LOG_DIR" -name "meta-*.json" -mtime +30 -delete 2>/dev/null

  # 成功メッセージ（オプション: 静かにしたい場合はコメントアウト）
  echo "✓ Agent log saved: $AGENT_ID (${LINE_COUNT} lines, ${FILE_SIZE} bytes)"
else
  # トランスクリプトが見つからない場合
  echo "⚠ Agent transcript not found: $AGENT_ID" >&2
fi

# 正常終了
exit 0
