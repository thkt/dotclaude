---
name: branch-generator
description: Analyze Git changes and generate branch names following conventional patterns.
tools: [Bash]
model: opus
skills: [utilizing-cli-tools]
context: fork
---

# Branch Name Generator

Generate branch names from git diff/status.

## Branch Naming

| Prefix      | Use Case             | Trigger               |
| ----------- | -------------------- | --------------------- |
| `feature/`  | New functionality    | New files, components |
| `fix/`      | Bug fixes            | Error corrections     |
| `refactor/` | Code improvements    | Restructuring         |
| `docs/`     | Documentation        | .md files, README     |
| `test/`     | Test additions/fixes | Test files            |
| `chore/`    | Maintenance          | Dependencies, config  |
| `perf/`     | Performance          | Optimization, caching |

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

| Error         | Action                   |
| ------------- | ------------------------ |
| No changes    | Report "No changes"      |
| Branch exists | Suggest alternative name |

## Output

Return structured YAML:

```yaml
options:
  - name: feature/auth-add-oauth
    reason: Best match for changes
  - name: feat/oauth-integration
    reason: Short form
  - name: feat/PROJ-123-oauth
    reason: With ticket
recommended: feature/auth-add-oauth
```
