---
description: Perform project research and technical investigation without implementation
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
context: fork
argument-hint: "[research topic or question]"
---

# /research - Project Research & Investigation

Investigate codebase with confidence-based findings, without implementation.

## Input

- Argument: research topic or question (required)
- If missing: prompt via AskUserQuestion

## Execution

| Phase | Agent                                          | Focus                                    |
| ----- | ---------------------------------------------- | ---------------------------------------- |
| 0     | (clarification)                                | Research intent → `/think` planning?     |
| 1     | `architecture-analyzer` ∥ `code-flow-analyzer` | Structure + execution flow (parallel)    |
| 2     | Task(Explore)                                  | Detail: code paths, patterns, edge cases |
| 3     | (synthesis)                                    | Consolidate with ✓/→/? markers           |

Note: Invoke via `Task(subagent_type: Explore)`.

### Phase 0: Intent Clarification

Ask via AskUserQuestion:

| Question         | Options                                              |
| ---------------- | ---------------------------------------------------- |
| Research intent  | Feature planning / Bug investigation / Understanding |
| Planning needed? | Yes → suggest `/think` after research                |

### Phase 1: Parallel Analysis

Run `architecture-analyzer` and `code-flow-analyzer` in parallel via Task.

Markers: [@../rules/core/AI_OPERATION_PRINCIPLES.md](../rules/core/AI_OPERATION_PRINCIPLES.md)

## Output

File: `$HOME/.claude/workspace/research/YYYY-MM-DD-[topic].md`
Template: [@../templates/research/template.md](../templates/research/template.md)

## Next Steps Section

Always include at end of output:

| Intent           | Suggested Next |
| ---------------- | -------------- |
| Feature planning | `/think`       |
| Bug fix          | `/fix`         |
| Understanding    | complete       |
