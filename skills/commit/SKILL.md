---
name: commit
description: Analyze Git diff and generate Conventional Commits format messages.
when_to_use: コミットして, コミット作成, commit changes
allowed-tools: Bash(git:*) Bash(cat:*) Bash(mv:*) AskUserQuestion
model: haiku
argument-hint: "[context or issue reference]"
---

# /commit - Git Commit Message Generator

## Input

- Context or issue reference: `$ARGUMENTS` (optional)
- If `$ARGUMENTS` is empty → analyze staged changes only

## Execution

| Step | Action                                                                   |
| ---- | ------------------------------------------------------------------------ |
| 1    | Read staged: `git status`, `git diff --staged` (parallel)                |
| 2    | Generate 3 candidates (varied scope/wording, see Type Detection + Rules) |
| 3    | Present via AskUserQuestion → user selects or customizes (Other)         |
| 4    | Execute selected commit (sandbox-compatible)                             |

## Type Detection

Infer type from diff context:

| Type     | When to use                                |
| -------- | ------------------------------------------ |
| feat     | New functionality or capability            |
| fix      | Bug fix or error correction                |
| refactor | Code restructuring without behavior change |
| docs     | Documentation only changes                 |
| test     | Adding or updating tests                   |
| chore    | Config, dependencies, maintenance          |
| perf     | Performance optimization                   |
| style    | Formatting, whitespace, linting            |
| ci       | CI/CD configuration changes                |

Default to `feat` if unclear.

## Rules

| Rule    | Guideline                                            |
| ------- | ---------------------------------------------------- |
| Subject | ≤72 chars, imperative, lowercase, no period          |
| Footer  | `BREAKING CHANGE:`, `Closes #123`, `Co-authored-by:` |

## Examples

```text
feat(auth): add OAuth2 authentication support
feat(api)!: remove deprecated endpoints  # BREAKING CHANGE
```

## Sandbox-Compatible Commit

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

## Error Handling

| Error             | Action                  |
| ----------------- | ----------------------- |
| No staged files   | Report "Nothing staged" |
| Empty diff        | Return minimal message  |
| No git repository | Report "Not a git repo" |
| Pre-commit failed | Report hook error       |

## Display Format

### Preview

```markdown
## Commit Preview

> <type>(<scope>): <description>

<body>

`<footer>`
```

### Success

Committed: `[short-hash]` <type>(<scope>): <description>
