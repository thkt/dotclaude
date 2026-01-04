#!/bin/bash
# daily-audit.sh - 毎朝の自動監査スクリプト
# 実行: crontab -e で 0 9 * * * ~/.claude/hooks/daily-audit.sh を追加

set -euo pipefail

# 設定
PROJECT_DIR="$HOME/.claude"
OUTPUT_DIR="$PROJECT_DIR/workspace/audit"
DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="$OUTPUT_DIR/$DATE.md"

# ログ関数
log() {
  echo "[$(date '+%H:%M:%S')] $1"
}

# 出力ディレクトリ確認
mkdir -p "$OUTPUT_DIR"

log "Starting daily audit for $PROJECT_DIR"


# Claude CLIで監査実行
cd "$PROJECT_DIR"

PROMPT="このClaude Code設定リポジトリを監査してください。

## チェック項目
1. **構造の一貫性**: CLAUDE.md、rules/、skills/、commands/ の整合性
2. **壊れた参照**: 存在しないファイルへのリンク
3. **重複ルール**: 異なるファイルで矛盾する設定
4. **改善提案**: ワークフロー効率化のアイデア

## 出力形式
- 問題があれば重要度順に箇条書き
- 問題がなければ「✅ 問題なし」と簡潔に報告
- 改善提案は別セクションで"

# 実行と出力
{
  echo "# Daily Audit Report - $DATE"
  echo ""
  echo "## 対象: $PROJECT_DIR"
  echo ""
  echo "---"
  echo ""

  # Claude CLI実行（--print で非対話モード、MCP無効化）
  if claude --print --mcp-config '{"mcpServers":{}}' --strict-mcp-config "$PROMPT" 2>&1; then
    log "Audit completed successfully"
  else
    echo "⚠️ Audit failed with exit code $?"
    log "Audit failed"
  fi
} > "$OUTPUT_FILE"

log "Report saved to $OUTPUT_FILE"

# 直近7日分のみ保持（オプション）
# find "$OUTPUT_DIR" -name "*.md" -mtime +7 -delete

echo "Done. See: $OUTPUT_FILE"
