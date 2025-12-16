---
description: >
  List and view planning documents (SOW/Spec) stored in workspace.
  Read-only viewer for active work monitoring.
  計画ドキュメント（SOW/Spec）の一覧表示と閲覧。
allowed-tools: Read, Glob
model: inherit
---

# /plans - Planning Document Viewer

## Purpose

List and view planning documents (SOW and Spec) stored in the workspace.

**Read-only**: Viewer for planning documents.

## Functionality

### List SOWs

Use Glob tool to find all SOW documents from both locations:

```markdown
# Global workspace (user-level)
Glob pattern: ~/.claude/workspace/planning/**/sow.md

# Project-specific workspace (current project)
Glob pattern: .claude/workspace/planning/**/sow.md
```

**Search Priority**: Project-specific SOWs are shown first, then global SOWs.

### View Latest SOW

1. Use Glob to find SOW files (sorted by modification time)
2. Use Read tool on the most recent file

### View Specific SOW

Use Read tool with the specific path:

```text
Read: ~/.claude/workspace/planning/[directory]/sow.md
```

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Available SOW Documents

📁 Project-specific (.claude/workspace/)
1. 2025-01-14-oauth-authentication
   Created: 2025-01-14
   Status: Draft

📁 Global (~/.claude/workspace/)
2. 2025-01-13-api-refactor
   Created: 2025-01-13
   Status: Active

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To view a specific document:
/plans "oauth-authentication"
```

## Usage Examples

### List All Plans

```bash
/plans
```

Shows all available planning documents with creation dates.

### View Latest

```bash
/plans --latest
```

Displays the most recently created plan.

### View Specific Plan

```bash
/plans "feature-name"
```

Shows the planning documents for a specific feature.

## Integration with Workflow

```text
1. Create: /sow "feature" or /think "feature"
2. View: /plans
3. Implement: /code
4. Validate: /validate
```

## Related Commands

- `/sow` - Create SOW only
- `/spec` - Create Spec only
- `/think` - Create SOW + Spec (orchestrator)
- `/validate` - Validate implementation against plan
