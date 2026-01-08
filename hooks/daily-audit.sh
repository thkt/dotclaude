#!/bin/bash
# daily-audit.sh - 毎朝の自動監査スクリプト
# 実行: crontab -e で 0 9 * * * ~/.claude/hooks/daily-audit.sh を追加

set -euo pipefail

# 設定
CLAUDE_CMD="/opt/homebrew/bin/claude"
PROJECT_DIR="$HOME/.claude"
OUTPUT_DIR="$PROJECT_DIR/workspace/audit"
DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="$OUTPUT_DIR/$DATE.md"

# 検証ログの永続化（Claude 4 BP - State Management）
STATE_FILE="$OUTPUT_DIR/.audit-state.json"
HISTORY_FILE="$OUTPUT_DIR/.audit-history.json"

# モデル設定（環境変数で上書き可能）
MODEL="${CLAUDE_MODEL:-sonnet}"

# ログ関数
log() {
  echo "[$(date '+%H:%M:%S')] $1"
}

# 出力ディレクトリ確認
mkdir -p "$OUTPUT_DIR"

log "Starting daily audit for $PROJECT_DIR"


# Claude CLIで監査実行
cd "$PROJECT_DIR"

# Claude 4 Best Practices + Skills Best Practices
# Ref: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices
# Ref: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

# Base prompt (English for better Claude 4 accuracy)
PROMPT_BASE='<context>
This repository contains Claude Code (CLI) personal configuration.
It manages 22 skills, 14 reviewer agents, and 25 commands.
Configuration consistency directly impacts development efficiency.
Broken references or conflicting rules negatively affect Claude Code behavior.
</context>

<success_criteria>
Audit succeeds when ALL of the following are met:
1. All [@...]() references point to existing files
2. Priority definitions (P0-P4) in CLAUDE.md are consistent with rules/
3. EN/JA corresponding files are synchronized
4. Each skills/*/SKILL.md has name and description in YAML frontmatter
</success_criteria>

<investigation_workflow>
ALWAYS read files before making judgments. NEVER report issues based on speculation.

Step 1: Reference Validation (can run in parallel)
- Use Grep to extract all [@...]() patterns
- Verify each reference path exists

Step 2: Structure Validation
- Read CLAUDE.md and extract priority definitions
- Cross-check with rules/core/ related files

Step 3: Synchronization Check
- Compare file counts between skills/ and skills/.ja/
- Compare rules/ and rules/.ja/ (if exists)

Step 4: Skill Validation
- Check YAML frontmatter in skills/*/SKILL.md
- Verify name and description fields exist
</investigation_workflow>

<output_format>
## Summary
- Total checks: N
- Passed: N
- Failed: N

## Issues (only if problems found)
| Severity | File | Issue | Fix Suggestion |
|----------|------|-------|----------------|

## Recommendations
Only specific and actionable improvements (max 3)

## Verification Log
Summary of commands used and results

## Machine-Readable State
Output the following JSON at the end (for history tracking):
```json
{
  "date": "YYYY-MM-DD",
  "total_checks": N,
  "passed": N,
  "failed": N,
  "issues": [{"severity": "high|medium|low", "file": "path", "issue": "description"}],
  "recommendations_count": N
}
```
</output_format>

<constraints>
- No speculation: Read files before judging
- Be specific: Always include file path and line number for issues
- Be concise: If no issues, just report "✅ All checks passed"
- No over-suggesting: Only propose truly valuable improvements
</constraints>

<feedback_loop>
Before reporting any issue:
1. Re-read the problematic file to confirm (avoid false positives)
2. Check related files (dependencies, imports, etc.)
3. Only report if confidence >= 80%
4. If confidence < 80%, list separately as "Needs Confirmation"
</feedback_loop>'

# Model-specific optimization (Skills BP)
# Haiku needs more detailed instructions, Opus can be more concise
PROMPT_HAIKU_EXTRA='
<model_guidance>
You are running as Haiku. Be thorough in your file reading and verification steps.
Execute each step explicitly and report what you found.
</model_guidance>'

PROMPT_OPUS_EXTRA='
<model_guidance>
You are running as Opus. Be efficient and focus on significant issues only.
Skip minor formatting inconsistencies unless they impact functionality.
</model_guidance>'

# Select prompt based on model
case "$MODEL" in
  haiku)
    PROMPT="${PROMPT_BASE}${PROMPT_HAIKU_EXTRA}"
    log "Using Haiku-optimized prompt"
    ;;
  opus)
    PROMPT="${PROMPT_BASE}${PROMPT_OPUS_EXTRA}"
    log "Using Opus-optimized prompt"
    ;;
  *)
    PROMPT="$PROMPT_BASE"
    log "Using standard prompt (model: $MODEL)"
    ;;
esac

# Execute and output
{
  echo "# Daily Audit Report - $DATE"
  echo ""
  echo "## Target: $PROJECT_DIR"
  echo "## Model: $MODEL"
  echo ""
  echo "---"
  echo ""

  # Claude CLI execution (--print for non-interactive mode, MCP disabled)
  if "$CLAUDE_CMD" --print --mcp-config '{"mcpServers":{}}' --strict-mcp-config "$PROMPT" 2>&1; then
    log "Audit completed successfully"
  else
    echo "⚠️ Audit failed with exit code $?"
    log "Audit failed"
  fi
} > "$OUTPUT_FILE"

log "Report saved to $OUTPUT_FILE"

# Extract JSON state from report and save (Claude 4 BP - State Management)
extract_json_state() {
  local json_block
  json_block=$(sed -n '/```json/,/```/p' "$OUTPUT_FILE" | sed '1d;$d')

  if [ -n "$json_block" ]; then
    # Save current state
    echo "$json_block" > "$STATE_FILE"
    log "State saved to $STATE_FILE"

    # Append to history (keep last 30 entries)
    if [ -f "$HISTORY_FILE" ]; then
      # Add new entry to existing history
      jq --argjson new "$json_block" '. + [$new] | .[-30:]' "$HISTORY_FILE" > "${HISTORY_FILE}.tmp" 2>/dev/null \
        && mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE" \
        || echo "[$json_block]" > "$HISTORY_FILE"
    else
      echo "[$json_block]" > "$HISTORY_FILE"
    fi
    log "History updated in $HISTORY_FILE"
  else
    log "Warning: No JSON state found in report"
  fi
}

extract_json_state

# Keep only last 7 days of reports (optional - move to Trash)
# find "$OUTPUT_DIR" -name "*.md" -mtime +7 -exec mv {} ~/.Trash/ \;

echo "Done. See: $OUTPUT_FILE"
echo "State: $STATE_FILE"
echo "History: $HISTORY_FILE"
