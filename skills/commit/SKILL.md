---
name: commit
description: Analyze Git diff, generate a Conventional Commits format message, and run the commit.
when_to_use: コミットして, コミット作成, commit changes
allowed-tools: Bash(git:*) Bash(cat:*) Bash(mv:*)
model: haiku
argument-hint: "[context or issue reference]"
---

# /commit - Git Commit Execution

Analyze the staged Git changes, generate a Conventional Commits format message, and run the commit.

## Input

`$ARGUMENTS` may contain context or an issue reference. Trim whitespace; if empty, analyze staged changes only. If non-empty, treat it as a hint for the message scope or footer.

## Execution

1. Run `git status` and `git diff --staged` in parallel to read the staged changes
2. Generate one message from the changes and `$ARGUMENTS`, following Type Detection and Rules
3. Run the commit directly via the sandbox-compatible commit

## Type Detection

Infer type from diff context. Default to feat if unclear.

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

## Rules

Subject is ≤72 chars, imperative, lowercase, no period. Footer uses `BREAKING CHANGE:` / `Closes #123` / `Co-authored-by:`.

```text
feat(auth): add OAuth2 authentication support
feat(api)!: remove deprecated endpoints  # BREAKING CHANGE
```

## Sandbox-Compatible Commit

```bash
cat > /tmp/claude/commit-msg.txt << 'EOF'
<message>
EOF
git commit -F /tmp/claude/commit-msg.txt
mv /tmp/claude/commit-msg.txt ~/.Trash/ 2>/dev/null || true
```

## Error Handling

| Error             | Action                  |
| ----------------- | ----------------------- |
| No staged files   | Report "Nothing staged" |
| Empty diff        | Return minimal message  |
| No git repository | Report "Not a git repo" |
| Pre-commit failed | Report hook error       |

## Output

Report the executed commit in one line.
