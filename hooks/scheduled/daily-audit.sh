#!/bin/bash
# Usage: crontab -e → "0 9 * * * ~/.claude/hooks/scheduled/daily-audit.sh"
set -euo pipefail

command -v jq >/dev/null 2>&1 || { echo "Error: jq required. Install: brew install jq" >&2; exit 1; }

CLAUDE_CMD="${CLAUDE_CMD:-$(command -v claude 2>/dev/null || echo '/opt/homebrew/bin/claude')}"
PROJECT_DIR="$HOME/.claude"
OUTPUT_DIR="$PROJECT_DIR/workspace/audit"
DATE=$(date +%Y-%m-%d)
OUTPUT_FILE="$OUTPUT_DIR/$DATE.md"
STATE_FILE="$OUTPUT_DIR/.audit-state.json"
HISTORY_FILE="$OUTPUT_DIR/.audit-history.json"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

mkdir -p "$OUTPUT_DIR"
log "Starting audit for $PROJECT_DIR"
cd "$PROJECT_DIR"

PROMPT='<context>
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
</constraints>'


{
  echo "# Daily Audit Report - $DATE"
  echo -e "\n## Target: $PROJECT_DIR\n---\n"

  if "$CLAUDE_CMD" --print --dangerously-skip-permissions \
    --tools "Read,Grep,Glob,LS" \
    --mcp-config '{"mcpServers":{}}' --strict-mcp-config \
    --output-format text "$PROMPT" 2>&1; then
    log "Audit completed"
  else
    echo "Audit failed with exit code $?"
    log "Audit failed"
  fi
} > "$OUTPUT_FILE"

log "Report saved to $OUTPUT_FILE"

extract_json_state() {
  local json_block
  # macOS: tail -r (not tac)
  json_block=$(tail -r "$OUTPUT_FILE" | sed -n '/^```$/,/^```json$/p' | tail -r | sed '1d;$d')

  [ -z "$json_block" ] && { log "No JSON state found"; return; }
  echo "$json_block" | jq . >/dev/null 2>&1 || { log "Invalid JSON"; return; }

  echo "$json_block" > "$STATE_FILE"

  if [ -f "$HISTORY_FILE" ]; then
    jq --argjson new "$json_block" '. + [$new] | .[-30:]' "$HISTORY_FILE" > "${HISTORY_FILE}.tmp" 2>&1 \
      && mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE" \
      || echo "[$json_block]" > "$HISTORY_FILE"
  else
    echo "[$json_block]" > "$HISTORY_FILE"
  fi
}

extract_json_state

echo "Done: $OUTPUT_FILE"
