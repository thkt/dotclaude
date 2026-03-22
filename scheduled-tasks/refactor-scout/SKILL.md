---
name: refactor-scout
description: Weekly code quality patrol: review target repositories and report refactoring candidates as GitHub issues
---

Review repositories and report areas for improvement as GitHub issues.

## Target Repositories

| Repository | Branch |
|-----------|---------|
| thkt/kagami | main |
| thkt/recall | main |

## Procedure

Execute the following for each repository:

### 1. Clone Repository

```bash
gh repo clone {repo} /tmp/refactor-scout-{repo_name} -- --depth 1 --branch {branch}
```

Delete `.claude/` directory in the clone if present (prevents behavioral side effects).

### 2. Understand Context

Read the following in order to understand project intent:

1. `docs/PURPOSE.md` (required — skip this repo if missing)
2. `CLAUDE.md` (if present)
3. `docs/adr/` or `adr/` (if present)
4. `README.md` (if present)

### 3. Code Analysis

No need to read the entire repo. Explore efficiently:

1. Check directory structure
2. Use PURPOSE.md Priorities and Accepted Tradeoffs as judgment criteria
3. Read files that appear important
4. For suspicious areas, check `git log --oneline -5 -- {file}` for change rationale
5. Check for related tests

### 4. Intent Check (mandatory before creating issues)

When a candidate is found, verify:

- Not covered by PURPOSE.md Accepted Tradeoffs
- Not recorded as an intentional design decision in ADRs
- No intentional reasoning in commit messages
- Not protected as intentional behavior by tests

If any apply, do not create an issue.

### 5. Duplicate Check

```bash
gh issue list --repo {repo} --label "refactor-scout" --state open --json number,title,body
```

Do not create issues for the same file and same concern.

### 6. Create Issues (max 3 per repo)

```bash
gh issue create --repo {repo} --label "refactor-scout" --title "[refactor-scout] {concern}: {target}" --body "..."
```

Body format:

```
## Detection Criteria

{What criteria triggered detection}

## Current State

{Relevant code excerpts, metrics}

## Context Verification

{Intent read from git log / ADR / tests}
{Rationale for concluding this is not intentional design}

## Improvement Proposal

{Concrete refactoring approach}

## Priority: {P1/P2/P3}

{Rationale: change frequency, impact scope, test coverage, etc.}
```

Priority criteria:
- P1: High change frequency + no tests + wide impact scope
- P2: Meets 2 of the above
- P3: Meets 1 of the above

### 7. Cleanup

```bash
rm -rf /tmp/refactor-scout-*
```

## Rules

- If PURPOSE.md is missing, do nothing and move to the next repo
- Max 3 issues per repo. If more candidates exist, pick the top 3 by priority
- Lint-level findings (formatting, naming conventions) are out of scope
- Only report areas that are questionable after understanding the intent
- If nothing needs improvement, create no issues. Do not force findings