---
description: Run CodeRabbit AI code review for external perspective analysis
allowed-tools: Bash(coderabbit:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read, Glob
model: inherit
argument-hint: "[--base <branch>] [--type <all|committed|uncommitted>]"
dependencies: [utilizing-cli-tools]
---

# /rabbit - CodeRabbit AI Review

Run external AI code review with CodeRabbit CLI.

## When to Use

| `/rabbit`             | `/audit`               |
| --------------------- | ---------------------- |
| Quick external review | Comprehensive review   |
| Second opinion        | Project-specific rules |
| Before commit/PR      | Architecture review    |
| Fast (10-30s)         | Slower (multi-agent)   |

## Usage

```bash
/rabbit                     # Review all changes
/rabbit --base main         # Against specific branch
/rabbit --type uncommitted  # Only uncommitted
```

## Sandbox Requirement

**CRITICAL**: Requires `dangerouslyDisableSandbox: true` for TTY support.

```typescript
Bash({
  command: "coderabbit review --prompt-only",
  dangerouslyDisableSandbox: true,
});
```

## Execution Time

| Scope       | Time      | Recommendation        |
| ----------- | --------- | --------------------- |
| < 10 files  | 10-30s    | Run inline            |
| 10-50 files | 1-5 min   | Inline or background  |
| 50+ files   | 7-30+ min | **Run in background** |

## Output Format

```text
CodeRabbit found N issues:

path/to/file.ts
  L42 [refactor] Description
  L78 [issue] Problem description

Recommendation: Run /fix to address
```

## Best Practices

```text
/rabbit → /fix (critical) → /rabbit (verify) → /commit

NOT: /rabbit → /fix → /rabbit → /fix → ... (infinite loop)
```

## Error Handling

| Error          | Action                  |
| -------------- | ----------------------- |
| Not a git repo | Suggest `git init`      |
| Auth required  | `coderabbit auth login` |
| No changes     | "Nothing to review"     |

## Integration

```text
Dev:  /code → /rabbit → /fix → /commit
PR:   /rabbit --base main → /audit → /pr
```
