---
description: Analyze Git diff and generate Conventional Commits format messages
allowed-tools: [Task, AskUserQuestion, Bash]
model: opus
argument-hint: "[context or issue reference]"
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

| Step | Action                                        |
| ---- | --------------------------------------------- |
| 1    | `Task` with `subagent_type: commit-generator` |
| 2    | Format and present preview                    |
| 3    | Confirm with user                             |
| 4    | Execute commit (sandbox-compatible method)    |

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
