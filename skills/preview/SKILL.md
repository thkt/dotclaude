---
name: preview
description: AI screening review for PRs - preliminary check before human review. Use when
  user mentions スクリーニング, PRレビュー, プレビュー, preview PR, pre-review.
  Do NOT use for deep multi-reviewer code quality audits (use /audit instead).
allowed-tools: [Bash(git:*), Bash(gh:*), Read, Grep, Glob, AskUserQuestion]
model: sonnet
argument-hint: "[PR URL or number]"
user-invocable: true
---

# /preview - PR Screening Review

## Input

- PR reference: `$1` (URL, number, or empty → detect from current branch)

## Execution

| Step | Action                                                                                       |
| ---- | -------------------------------------------------------------------------------------------- |
| 1    | Identify PR: `gh pr view $1 --json number,title,body,labels,files,url` (fallback: omit `$1`) |
| 2    | Abort if no PR found or working tree is dirty (`git status --porcelain`)                     |
| 3    | Checkout PR: `gh pr checkout $PR`                                                            |
| 4    | Gather PR context in parallel (see below)                                                    |
| 5    | Read each changed file locally for full context                                              |
| 6    | Review per process: overview → per-file → dependency impact → findings                       |
| 7    | Output structured screening report                                                           |

### PR Context Gathering

```bash
# Metadata
gh pr view --json title,body,labels,files,url $PR

# Diff
gh pr diff $PR

# Existing comments
gh pr view --comments $PR

# Inline comments
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '.[] | {file: .path, user: .user.login, comment: .body}'
```

Never include `author` in gh output fields.

## Comment Labels

| Label    | Meaning                         | Severity |
| -------- | ------------------------------- | -------- |
| `[must]` | Requires fix before merge       | High     |
| `[want]` | Should fix, not blocking        | Medium   |
| `[imo]`  | Personal opinion, take or leave | Low      |
| `[ask]`  | Question needing clarification  | -        |
| `[nits]` | Minor style/formatting issue    | Low      |
| `[info]` | Context sharing, no action      | -        |

## Comment Tone

| Rule            | Detail                                                                              |
| --------------- | ----------------------------------------------------------------------------------- |
| Format          | `[label] <observed behavior or risk>. <suggestion>. (file:line)`                    |
| Concise         | 3 lines for `[imo]`/`[nits]`/`[info]`; up to 5 for `[must]`/`[want]` with evidence  |
| Respectful      | Acknowledge effort, avoid commands                                                  |
| Suggestive      | "Consider..." not "This is wrong"                                                   |
| Author-targeted | Comments may be posted verbatim — calibrate detail for the PR author                |

## Output

```markdown
## PR Screening Report

### Overview

{Background and purpose in 2-3 sentences}

### Changes Summary

| File | Change Summary |
| ---- | -------------- |

### Dependency Impact

{Affected files, regression risk}

---

### Requires Action

{`[must]` and `[want]` findings with file:line}

### Awareness

{`[imo]`, `[ask]`, `[nits]`, `[info]` items with file:line}

---

### Proposed Review Comments

{Grouped by file, with labels}
```

## Rules

| Rule               | Detail                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| No auto-post       | Never post comments to PR automatically                                |
| Abort on dirty     | If uncommitted changes exist, warn and abort                           |
| Speed over depth   | This is screening, not full audit                                      |
| Verify before flag | Before [ask]/[want]+, confirm the issue manifests in actual user paths |

## /preview vs /audit

| Aspect | /preview            | /audit                       |
| ------ | ------------------- | ---------------------------- |
| Scope  | PR diff only        | Any file set                 |
| Depth  | Screening (1 pass)  | Multi-reviewer + challenger  |
| Speed  | Fast (sonnet)       | Thorough (opus, parallel)    |
| Use    | Before human review | Before merge or quality gate |

## References

| Topic            | File                                                 |
| ---------------- | ---------------------------------------------------- |
| Review Checklist | `${CLAUDE_SKILL_DIR}/references/review-checklist.md` |
