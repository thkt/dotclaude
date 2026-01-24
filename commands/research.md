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

- Research topic or question: `$1` (required)
- If `$1` is empty → prompt via AskUserQuestion

## Execution

| Phase | Agent                                          | Focus                                      |
| ----- | ---------------------------------------------- | ------------------------------------------ |
| 0     | (codemap check)                                | Read `.codemaps/architecture.md` if exists |
| 1     | (clarification)                                | Research intent → `/think` planning?       |
| 2     | `architecture-analyzer` ∥ `code-flow-analyzer` | Structure + execution flow (parallel)      |
| 3     | Task(Explore)                                  | Detail: code paths, patterns, edge cases   |
| 4     | (synthesis)                                    | Consolidate with ✓/→/? markers             |

Note: Invoke via `Task(subagent_type: Explore)`.

### Phase 1: Intent Clarification

Ask via AskUserQuestion:

| Question         | Options                                              |
| ---------------- | ---------------------------------------------------- |
| Research intent  | Feature planning / Bug investigation / Understanding |
| Planning needed? | Yes → suggest `/think` after research                |

### Phase 2: Parallel Analysis

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
