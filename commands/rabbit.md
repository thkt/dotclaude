---
description: Run CodeRabbit AI code review for external perspective analysis
allowed-tools: Bash(coderabbit:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read, Glob
model: opus
argument-hint: "[--base <branch>] [--type <all|committed|uncommitted>]"
dependencies: [utilizing-cli-tools]
---

# /rabbit - CodeRabbit AI Review

Run external AI code review with CodeRabbit CLI.

## Input

- No argument: review all changes
- `--base <branch>`: compare against specific branch
- `--type`: `all`, `committed`, `uncommitted`

## Execution

**CRITICAL**: Requires `dangerouslyDisableSandbox: true` for TTY support.

```typescript
Bash({
  command: "coderabbit review --prompt-only",
  dangerouslyDisableSandbox: true,
});
```

### Scope-based Execution

| Scope       | Time      | Mode                |
| ----------- | --------- | ------------------- |
| < 10 files  | 10-30s    | Inline              |
| 10-50 files | 1-5 min   | Optional background |
| 50+ files   | 7-30+ min | Background          |

## Output

```markdown
## CodeRabbit Review

| Metric   | Value           |
| -------- | --------------- |
| Files    | X               |
| Issues   | X               |
| Severity | High/Medium/Low |

### Issues Found

| File        | Line | Issue         | Severity |
| ----------- | ---- | ------------- | -------- |
| src/auth.ts | 42   | [description] | High     |

### Recommendations

[Actionable suggestions]
```

## Error Handling

| Error          | Action                  |
| -------------- | ----------------------- |
| Not a git repo | Suggest `git init`      |
| Auth required  | `coderabbit auth login` |
| No changes     | "Nothing to review"     |
