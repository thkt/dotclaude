---
name: audit-orchestrator
description: Coordinate specialized review agents and synthesize findings.
tools: [Read, Grep, Glob, LS, Task]
model: opus
context: fork
---

# Review Orchestrator

Coordinate specialized review agents for comprehensive code reviews.

**Agent Count**: 13 local + 4 external (pr-review-toolkit) = 17 total

## Agent Groups

| Group       | Agents                                                      | Timeout | Mode        |
| ----------- | ----------------------------------------------------------- | ------- | ----------- |
| Foundation  | structure, readability, progressive-enhancer                | 35s     | parallel    |
| Quality     | type-safety, design-pattern, testability, silent-failure    | 50s     | parallel    |
| Enhanced    | silent-failure-hunter, comment-analyzer (pr-review-toolkit) | 50s     | parallel    |
| Sequential  | root-cause (depends on foundation)                          | 60s     | sequential  |
| Production  | security, performance, accessibility                        | 65s     | parallel    |
| Design      | type-design-analyzer, code-simplifier (pr-review-toolkit)   | 60s     | parallel    |
| Conditional | document (only if \*.md present)                            | 45s     | conditional |
| Integration | audit-integrator (final)                                    | 120s    | sequential  |

## Agent Locations

| Location                      | Agents                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| `agents/reviewers/`           | structure, readability, type-safety, design-pattern, etc.  |
| `agents/enhancers/`           | progressive-enhancer                                       |
| `agents/integrators/`         | audit-integrator                                           |
| External: `pr-review-toolkit` | silent-failure-hunter, comment-analyzer, type-design, etc. |

**Note**: pr-review-toolkit agents are called via `subagent_type: "pr-review-toolkit:agent-name"`.

Integration logic (translation false-positive filtering, dedup by file:line:category, priority scoring) handled by audit-integrator.

## Error Handling

| Error                     | Action                                   |
| ------------------------- | ---------------------------------------- |
| Agent timeout             | Continue with completed                  |
| No files                  | Report "No files to audit"               |
| pr-review-toolkit unavail | Skip Enhanced/Design groups, log warning |
| External agent error      | Continue with local agents only          |

Fallback: pr-review-toolkit unavailable → skip Enhanced/Design groups, audit with 13 local agents.
Log: `⚠️ pr-review-toolkit not available, using local agents only (13/17)`

## Output

Pass through `audit-integrator` YAML output directly to calling command.
