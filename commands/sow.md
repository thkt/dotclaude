---
name: sow
description: SOW進捗状況を表示
priority: high
suitable_for:
  type: [monitoring, tracking]
  phase: [development, verification]
  understanding: "≥ 90%"
aliases: [progress, status]
timeout: 5
allowed-tools: Read, Grep, Bash(ls)
context:
  sow_dir: "workspace/sow/"
  display_mode: "read-only"
---

# /sow - SOW Progress Viewer

## Purpose

Display current SOW (Statement of Work) progress status in a simple, read-only format.

## Philosophy

- **No Options**: Optimal information display without options
- **Read-Only**: Display only, updates handled by other commands
- **Essential Info**: Minimal set of critical information

## Usage

```bash
/sow
```

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SOW: User Authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: In Progress 🔄
Progress: 65% ███████░░░░

Acceptance Criteria: 8/12 ✅
├─ Completed: 8
├─ In Progress: 2
└─ Pending: 2

Key Metrics:
├─ Test Coverage: 82% ✅
├─ Build Status: Passing ✅
└─ Last Updated: 2 hours ago

Next Actions:
• Complete AC-009: Password reset
• Fix failing tests in auth module
```

## What It Shows

1. **SOW Title** - Current SOW name
2. **Overall Progress** - Completion percentage
3. **Acceptance Criteria** - Completed/In-progress/Pending counts
4. **Key Metrics** - Coverage and build status
5. **Next Actions** - Priority tasks to complete

## Error Handling

### No SOW Found

```markdown
❌ No active SOW found

Create one with: /think "feature description"
```

### Multiple SOWs

```markdown
🔍 Multiple SOWs found:

1. User Authentication (Active) ✓
2. Payment System
3. Notification Service

Showing: User Authentication
```

## Integration

```bash
/think
/sow
/validate
```

## Performance

- Display time: <100ms
- No file modifications
- Minimal resource usage

## Related Commands

- `/think` - Create new SOW
- `/validate` - Validate against SOW
