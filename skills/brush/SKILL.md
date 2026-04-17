---
name: brush
description: >
  Enrich a vague prompt by routing to the best skill or injecting relevant rules
  and constraints. Use when prompt is rough or missing perspective. Examples:
  "find bugs", "refactor this", "add feature X", プロンプト補完, ブラッシュアップ.
  Do NOT use when the prompt is already detailed.
allowed-tools: Read, Glob, Grep, LS
model: opus
argument-hint: "[rough prompt]"
user-invocable: true
---

# /brush

Route a vague prompt to the best skill, or enrich it with relevant rules and
constraints when no skill fits.

## Input

`$1`: rough prompt (required). If empty, output usage example and exit.

## Execution

| Step | Action | Detail |
| --- | --- | --- |
| 1 | Classify | Identify task type from `$1`: refactor / bug-fix / feature / review / investigation / other |
| 2 | Scan skills | `Glob ~/.claude/skills/*/SKILL.md`; read descriptions of 3–5 candidates that match the task type |
| 3 | Route or enrich | See decision below |
| 4 | Output | See format below |

## Decision

### Route (skill found)

A skill is a clear match when its "Use when" description covers the task.

Output the routing recommendation. Include any gap — what the skill does NOT
cover — if the original prompt had scope the skill won't handle.

### Enrich (no skill match)

Rules from `~/.claude/rules/` are already loaded in context. Select the
relevant ones and make them explicit in the rewritten prompt.

| Category | Inject when |
| --- | --- |
| PRINCIPLES.md (Occam, DRY, YAGNI) | Refactoring, architecture decisions |
| CODE_THRESHOLDS.md | Any code quality ask |
| CODE_STRUCTURE.md | Structural or organization questions |
| SECURITY.md | Auth, input handling, API endpoints |
| PRE_TASK_CHECK.md | Broad implementation requests |

Only inject rules that are directly relevant. Do not add length for thoroughness.

## Output Format

### Route case

```
→ /skill-name [suggested args]

Covers: [what the skill handles from the original prompt]
Gap: [what it does not cover, if any]
```

### Enrich case

```
Original:
> [verbatim input]

Enriched:
> [rewritten prompt]

Added:
- [rule or principle]: [what was injected and why]
```
