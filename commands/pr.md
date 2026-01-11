---
description: Analyze branch changes and generate comprehensive PR description
allowed-tools: Task
model: inherit
dependencies: [pr-generator, utilizing-cli-tools, managing-git-workflows]
---

# /pr - Pull Request Description Generator

Analyze all changes in the current branch and generate comprehensive PR descriptions.

## Workflow Reference

**Full format**: [@../skills/managing-git-workflows/references/pr-descriptions.md](../skills/managing-git-workflows/references/pr-descriptions.md)

## How It Works

Delegates to `pr-generator` subagent:

1. Detects base branch (main/master/develop)
2. Analyzes git diff, commit history, file changes
3. Generates PR description with alternatives

## Usage

```bash
/pr                    # Generate from current branch
/pr "#456"             # Link to issue
/pr "Context..."       # Add custom context
```

## PR Structure

| Section        | Content             |
| -------------- | ------------------- |
| **Summary**    | High-level overview |
| **Motivation** | Why these changes   |
| **Changes**    | Detailed breakdown  |
| **Testing**    | Verification steps  |
| **Related**    | Linked issues/PRs   |

## Optional Sections

- Screenshots (UI changes)
- Breaking Changes (API)
- Performance Impact
- Migration Guide

## Context Efficiency

- No codebase files loaded
- Only git metadata analyzed
- Fast execution (<10 seconds)

## Related

- `/branch` - Branch names
- `/commit` - Commit messages
- `/audit` - Code review after PR
