---
description: >
  Diagnose current context usage and provide token optimization recommendations.
  Displays token usage, file count, session cost. Helps identify context-heavy operations.
  Use when context limits are approaching or to optimize session efficiency.
  現在のコンテキスト使用状況を診断し、トークン最適化の推奨事項を提供。
allowed-tools: Read, Glob, Grep, LS, Bash(wc:*), Bash(du:*), Bash(find:*)
model: inherit
---

# /context - Context Diagnostics & Optimization

## Purpose

Diagnose current context usage and provide token optimization recommendations.

## Dynamic Context Analysis

### Session Statistics

```bash
!`wc -l ~/.claude/CLAUDE.md ~/.claude/rules/**/*.md 2>/dev/null | tail -1`
```

### Current Working Files

```bash
!`find . -type f -name "*.md" -o -name "*.json" -o -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l`
```

### Modified Files in Session

```bash
!`git status --porcelain 2>/dev/null | wc -l`
```

### Memory Usage Estimate

```bash
!`du -sh ~/.claude 2>/dev/null`
```

## Context Optimization Strategies

### 1. File Analysis

- **Large Files Detection**: Identify files over 500 lines
- **Redundant Files**: Detect unused files
- **Pattern Files**: Suggest compression for repetitive patterns

### 2. Token Usage Breakdown

```markdown
## Token Usage Analysis
- System Prompts: ~[calculated]
- User Messages: ~[calculated]
- Tool Results: ~[calculated]
- Total Context: ~[calculated]
```

### 3. Optimization Recommendations

Based on analysis, recommended optimizations:

1. **File Chunking**: Split large files
2. **Selective Loading**: Load only necessary parts
3. **Context Pruning**: Remove unnecessary information
4. **Compression**: Compress repetitive information

## Usage Examples

### Basic Context Check

```bash
/context
# Display current context usage
```

### With Optimization

```bash
/context --optimize
# Detailed analysis with optimization suggestions
```

### Token Limit Check

```bash
/context --check-limit
# Check usage against token limit
```

## Output Format

```markdown
📊 Context Diagnostic Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Usage:
- Current Tokens: ~XXXk / 200k
- Utilization: XX%
- Estimated Remaining: ~XXXk tokens

📁 File Statistics:
- Loaded: XX files
- Total Lines: XXXX lines
- Largest File: [filename] (XXX lines)

⚠️ Warnings:
- [Warning if approaching 200k limit]
- [Warning for large files]

💡 Optimization Suggestions:
1. [Specific suggestion]
2. [Specific suggestion]

📝 Session Info:
- Start Time: [timestamp]
- Files Modified: XX
- Estimated Cost: $X.XX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Integration with Other Commands

- `/doctor` - Full system diagnostics
- `/status` - Status check
- `/cost` - Cost calculation

## Best Practices

1. **Regular Checks**: Run periodically during large tasks
2. **Warning at Limit**: Alert at 180k tokens (90%)
3. **Auto-optimization**: Suggest automatic compression when needed

## Advanced Features

### Context History

View past context usage history:

```bash
ls -la ~/.claude/logs/sessions/latest-session.json 2>/dev/null
```

### Real-time Monitoring

Track usage in real-time:

```bash
echo "Current context estimation in progress..."
```

## Notes

- Leverages `exceeds_200k_tokens` flag added in Version 1.0.86
- Settings changes reflect immediately without restart (v1.0.90)
- Session statistics saved automatically via SessionEnd hook
