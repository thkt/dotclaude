---
name: checkout
description: Analyze Git changes and suggest appropriate branch names.
when_to_use: ブランチ名, ブランチ作成, branch name
allowed-tools: Bash(git:*) AskUserQuestion
model: haiku
argument-hint: "[context or ticket number]"
---

# /checkout - Git Branch Name Generator

## Input

- Context or ticket number: `$ARGUMENTS` (optional)
- If `$ARGUMENTS` is empty → analyze git diff/status only

## Execution

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | Read changes: `git status`, `git diff` (parallel)     |
| 2    | Generate 3 branch name candidates (see Branch Naming) |
| 3    | Present options via `AskUserQuestion` with reasons    |
| 4    | Create selected branch via `git checkout -b`          |

## Branch Naming

| Prefix    | Use Case             | Trigger               |
| --------- | -------------------- | --------------------- |
| feature/  | New functionality    | New files, components |
| fix/      | Bug fixes            | Error corrections     |
| refactor/ | Code improvements    | Restructuring         |
| docs/     | Documentation        | .md files, README     |
| test/     | Test additions/fixes | Test files            |
| chore/    | Maintenance          | Dependencies, config  |
| perf/     | Performance          | Optimization, caching |

## Format

```text
<type>/<scope>-<description>
<type>/<ticket>-<description>
```

| Good                             | Bad                            |
| -------------------------------- | ------------------------------ |
| `feature/auth-add-oauth-support` | `new-feature` (no type)        |
| `fix/api-resolve-timeout-issue`  | `feature/ADD_USER` (uppercase) |
| `feature/PROJ-123-user-search`   | `fix/bug` (too vague)          |

## Rules

| Do                        | Don't                       |
| ------------------------- | --------------------------- |
| Use lowercase             | Use spaces/underscores      |
| Use hyphens as separators | Use CamelCase/PascalCase    |
| Keep concise (2-4 words)  | Make vague names ("update") |
| Include ticket ID         | Include dates               |

## Error Handling

| Error             | Action                   |
| ----------------- | ------------------------ |
| No changes        | Report "No changes"      |
| Branch exists     | Suggest alternative name |
| No git repository | Report "Not a git repo"  |

## Display Format

### Success

Created branch: `[selected-branch-name]`
