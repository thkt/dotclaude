---
description: Run CodeRabbit AI code review for external perspective analysis
allowed-tools: Bash(coderabbit:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read, Glob
model: inherit
argument-hint: "[--base <branch>] [--type <all|committed|uncommitted>]"
dependencies: [utilizing-cli-tools]
---

# /rabbit - CodeRabbit AI Review

## Purpose

Run CodeRabbit CLI for external AI code review. Provides a second opinion from an independent AI system with different analysis patterns.

## Authentication (Recommended)

For enhanced reviews, authenticate first:

```bash
coderabbit auth login
```

**Benefits of authentication:**

- Team learnings applied to reviews
- Full contextual analysis
- Team standards enforcement
- Personalized recommendations

Check auth status in Error Handling section if issues occur.

## When to Use

| Use `/rabbit` | Use other command |
| --- | --- |
| Quick external review | Comprehensive review → `/audit` |
| Before commit/PR | Architecture review → `/audit` |
| Second opinion needed | Internal patterns check → `/audit` |
| Specific branch diff | Project rule compliance → `/audit` |

## Comparison with /audit

| Aspect | `/rabbit` | `/audit` |
| --- | --- | --- |
| Source | External AI (CodeRabbit) | Internal agents |
| Speed | Fast (10-30s) | Slower (multi-agent) |
| Focus | General code quality | Project-specific rules |
| Best for | Quick sanity check | Comprehensive review |

## Execution Time

Review time varies by scope:

| Scope | Time | Recommendation |
| --- | --- | --- |
| Small (< 10 files) | 10-30 seconds | Run inline |
| Medium (10-50 files) | 1-5 minutes | Run inline or background |
| Large (50+ files) | 7-30+ minutes | **Run in background** |

For large reviews, tell your AI agent to run CodeRabbit in the background and check back later.

## AI Agent Best Practices

When using `/rabbit` with AI agents (Claude Code, Cursor, etc.):

1. **Loop limits**: Limit to 2-3 review cycles to prevent infinite fix loops
2. **Background for large PRs**: Use `run_in_background: true` for 50+ file changes
3. **Don't chase perfection**: Fix critical issues, accept minor suggestions as-is

```markdown
Recommended workflow:
/rabbit → /fix (critical only) → /rabbit (verify) → /commit

NOT:
/rabbit → /fix → /rabbit → /fix → /rabbit → ... (infinite loop)
```

## Usage

### Basic (review uncommitted + recent commits)

```bash
/rabbit
```

### Review against specific branch

```bash
/rabbit --base main
```

### Review only uncommitted changes

```bash
/rabbit --type uncommitted
```

### Review with custom config

```bash
/rabbit --config CLAUDE.md
```

## Sandbox Requirement

**CRITICAL**: CodeRabbit CLI requires TTY/Raw mode for its terminal UI (Ink framework).

When executing `coderabbit review`, you MUST use `dangerouslyDisableSandbox: true` in the Bash tool call:

```typescript
Bash({
  command: "coderabbit review --prompt-only",
  dangerouslyDisableSandbox: true  // Required for TTY support
})
```

**Why**: The sandbox environment provides non-TTY stdin, causing:

- "Raw mode is not supported" errors
- Hanging at "Connecting to review service"

## Execution

### Step 1: Check Git Status

```bash
!`git status --short | head -10`
```

### Step 2: Run CodeRabbit Review

Execute CodeRabbit with appropriate options:

```bash
# Default: review all changes
coderabbit review --prompt-only

# With base branch (if specified)
coderabbit review --prompt-only --base <branch>

# With type filter (if specified)
coderabbit review --prompt-only --type <type>
```

### Step 3: Parse and Display Results

Format the output for readability:

```markdown
## 🐰 CodeRabbit Review Results

### Issues Found

| File | Line | Type | Description |
|------|------|------|-------------|
| ... | ... | ... | ... |

### Summary

- Total issues: X
- By type: refactor (N), potential_issue (N), ...

### Recommended Actions

1. [Priority issues to address]
2. [Optional improvements]
```

### Step 4: Offer Next Steps

```markdown
---
📋 Next steps:
- Apply fixes: `/fix` with specific issues
- Full review: `/audit` for comprehensive analysis
- Commit: `/commit` if issues are acceptable
```

## Output Format

**Minimal (no issues)**:

```text
✅ CodeRabbit: No issues found
```

**With issues**:

```text
🐰 CodeRabbit found N issues:

📁 path/to/file.ts
  L42 [refactor] Description of suggestion
  L78 [issue] Description of potential problem

📁 another/file.ts
  L15 [refactor] Another suggestion

💡 Run `/fix` to address these issues
```

## Error Handling

| Error | Action |
| --- | --- |
| Not a git repo | Display error, suggest `git init` |
| No changes to review | Display "Nothing to review" |
| Auth required | Suggest `coderabbit auth login` |
| Network error | Retry once, then display error |

## Integration with Workflow

```text
Development Flow:
  /code → /rabbit → /fix (if needed) → /commit

PR Flow:
  /rabbit --base main → /audit → /pr
```
