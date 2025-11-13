---
description: >
  Display current SOW progress status, showing acceptance criteria completion, key metrics, and build status.
  Read-only viewer for active work monitoring. Lists and views Statement of Work documents stored in workspace.
  Use to check implementation progress anytime during development.
  SOW文書の一覧表示と閲覧。受け入れ基準の完了状況、主要メトリクス、ビルドステータスを表示。
allowed-tools: Read, Bash(ls:*), Bash(find:*), Bash(cat:*)
model: inherit
---

# /sow - SOW Document Viewer

## Purpose

List and view Statement of Work (SOW) documents stored in the workspace.

**Simplified**: Read-only viewer for planning documents.

## Functionality

### List SOWs

```bash
!`ls -la ~/.claude/workspace/sow/`
```

### View Latest SOW

```bash
!`ls -t ~/.claude/workspace/sow/*/sow.md | head -1 | xargs cat`
```

### View Specific SOW

```bash
# By date or feature name
!`cat ~/.claude/workspace/sow/[directory]/sow.md`
```

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Available SOW Documents

1. 2025-01-14-oauth-authentication
   Created: 2025-01-14
   Status: Draft

2. 2025-01-13-api-refactor
   Created: 2025-01-13
   Status: Active

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To view a specific SOW:
/sow "oauth-authentication"
```

## Usage Examples

### List All SOWs

```bash
/sow
```

Shows all available SOW documents with creation dates.

### View Latest SOW

```bash
/sow --latest
```

Displays the most recently created SOW.

### View Specific SOW

```bash
/sow "feature-name"
```

Shows the SOW for a specific feature.

## Integration with Workflow

```markdown
1. Create SOW: /think "feature"
2. View SOW: /sow
3. Track Tasks: Use TodoWrite independently
4. Reference SOW during implementation
```

## Simplified Design

- **Read-only**: No modification capabilities
- **Static documents**: SOWs are planning references
- **Clear separation**: SOW for planning, TodoWrite for execution

## Related Commands

- `/think` - Create new SOW
- `/todos` - View current tasks (separate from SOW)

## Applied Principles

### Single Responsibility

- SOW viewer only views documents
- No complex synchronization

### Occam's Razor

- Simple file listing and viewing
- No unnecessary features

### Progressive Enhancement

- Start with basic viewing
- Add search/filter if needed later
