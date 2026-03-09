---
name: commit
description:
  Analyze Git diff and generate Conventional Commits format messages. Use when
  user mentions コミットして, コミット作成, commit changes.
allowed-tools: Bash(git:*), Bash(cat:*), Bash(mv:*), Task, AskUserQuestion
model: opus
argument-hint: "[context or issue reference]"
user-invocable: true
---

# /commit - Git Commit Message Generator

Analyze staged changes and generate Conventional Commits messages.

## Input

- Context or issue reference: `$1` (optional)
- If `$1` is empty → analyze staged changes only

## Agent

| Type  | Name             | Purpose                         |
| ----- | ---------------- | ------------------------------- |
| Agent | commit-generator | Conventional Commits gen (fork) |

## Execution

| Step | Action                                                                     |
| ---- | -------------------------------------------------------------------------- |
| 1    | `Task` with `subagent_type: commit-generator`, `mode: "bypassPermissions"` |
| 2    | Present 3 message candidates via AskUserQuestion                           |
| 3    | User selects or customizes (Other)                                         |
| 4    | Execute selected commit (sandbox-compatible)                               |

### Message Selection (Step 2)

Present 3 generator candidates as AskUserQuestion options (varied
scope/wording).

### Sandbox-Compatible Commit

```bash
# Multi-line: file-based
cat > /tmp/claude/commit-msg.txt << 'EOF'
<message>
EOF
git commit -F /tmp/claude/commit-msg.txt
mv /tmp/claude/commit-msg.txt ~/.Trash/ 2>/dev/null || true

# Single-line: multiple -m flags
git commit -m "subject" -m "body"
```

## Flow: Preview

```text
[Generator YAML] → [Preview] → [Confirm] → [Execute]
```

## Display Format

### Preview

```markdown
## 📝 Commit Preview

> **<type>(<scope>)**: <description>

<body>

`<footer>`
```

### Success

**Committed**: `[short-hash]` <type>(<scope>): <description>

## Verification

| Check                                                 | Required |
| ----------------------------------------------------- | -------- |
| `Task` called with `subagent_type: commit-generator`? | Yes      |
