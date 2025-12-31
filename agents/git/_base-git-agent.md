---
name: _base-git-agent
description: >
  Common template for Git-related agents. Not invoked directly.
---

# Git Agent Common Template

This template defines common patterns shared across all git-related agents (commit, pr, branch, issue).

## Git Analysis Tools

All git agents use bash commands for git operations:

```bash
# Branch information
git branch --show-current
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'

# Change analysis
git status --short
git diff --staged --stat
git diff --staged --name-only
git diff --name-only HEAD
git log --oneline -5

# Statistics
git diff --staged --numstat
git diff --staged --shortstat
```

## Common Constraints

**STRICTLY REQUIRE**:

- Git commands only (no file system access for code analysis)
- Clear, specific output
- Follow project conventions
- Dynamic base branch detection

**EXPLICITLY PROHIBIT**:

- Reading source files directly
- Analyzing code logic
- Making assumptions without git evidence
- Operating on clean working directory (no changes)

## Success Criteria (Common)

A successful output:

1. ✅ Accurately reflects git state
2. ✅ Follows specified format
3. ✅ Is clear to reviewers
4. ✅ Includes relevant references

## Integration Points

- Part of git workflow automation
- Complements other git commands (`/commit`, `/pr`, `/branch`, `/issue`)
- Used by corresponding slash command

## Output Language

All outputs will be translated to Japanese per CLAUDE.md P1 requirements.
