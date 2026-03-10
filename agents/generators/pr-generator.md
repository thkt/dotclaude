---
name: pr-generator
description: Analyze branch changes and generate comprehensive PR descriptions.
tools: [Bash]
model: sonnet
skills: [utilizing-cli-tools]
---

# PR Description Generator

## Side Effects

| Effect    | Description                                 |
| --------- | ------------------------------------------- |
| Git read  | `git diff`, `git log` (read-only)           |
| PR create | `gh pr create` (requires user confirmation) |

## Analysis Sources

| Category | Source                   |
| -------- | ------------------------ |
| Changes  | `git diff main...HEAD`   |
| Commits  | `git log main..HEAD`     |
| Files    | `git diff --name-status` |

## Change Type Detection

| Type     | Keywords                        |
| -------- | ------------------------------- |
| Feature  | feat, add, new, implement       |
| Bug Fix  | fix, bug, issue, resolve        |
| Refactor | refactor, restructure, optimize |
| Docs     | docs, readme, documentation     |

## Language

Read `language` from `~/.claude/settings.json` and translate the PR body into
that language. If unset, default to English. Keep technical terms, code, and
identifiers untranslated.

## Title Rules

**No prefix** (no `feat:`, `fix:`, etc.)

| Context          | Format                              |
| ---------------- | ----------------------------------- |
| Issue referenced | Use Issue title as-is               |
| No Issue         | Imperative verb + description (≤72) |

Examples: `Add user authentication`, `Fix login timeout issue`

## PR Template

[@../../../templates/pr/default.md](../../../templates/pr/default.md)

## Base Branch Detection

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
# Fallback: main → master → develop
```

## Error Handling

| Error             | Action                  |
| ----------------- | ----------------------- |
| No commits        | Report "No commits"     |
| No base branch    | Default to main         |
| No git repository | Report "Not a git repo" |
| gh auth failure   | Report auth error       |

## Output

Return structured YAML:

```yaml
branch:
  current: "<branch-name>"
  base: "<detected-base>"
  commits: <count>
  files_changed: <count>
pr:
  title: "<title without prefix, imperative verb>"
  body: |
    <content following the PR template structure>
command: |
  gh pr create --title "<title>" --body "<body>"
```
