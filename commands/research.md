---
description: Perform project research and technical investigation without implementation
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(wc:*), Read, Glob, Grep, LS, Task, AskUserQuestion
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

| Phase | Agent                                          | Focus                                            |
| ----- | ---------------------------------------------- | ------------------------------------------------ |
| 0     | (codemap check)                                | Read `.analysis/architecture.md` if exists       |
| 1     | (clarification)                                | Research intent → `/think` planning?             |
| 2     | `architecture-analyzer` + `code-flow-analyzer` | Structure + execution flow (parallel)            |
| 3     | Task(Explore)                                  | Detail: code paths, patterns, edge cases         |
| 3.5   | (Strong Inference)                             | ≥3 hypotheses → discriminating tests → eliminate |
| 4     | (synthesis)                                    | Consolidate with ✓/→/? markers                   |

Note: Invoke via `Task(subagent_type: Explore)`.

### Phase 1: Intent Clarification

Ask via AskUserQuestion:

| Question         | Options                                              |
| ---------------- | ---------------------------------------------------- |
| Research intent  | Feature planning / Bug investigation / Understanding |
| Planning needed? | Yes → suggest `/think` after research                |

### Phase 2: Parallel Analysis

Run `architecture-analyzer` and `code-flow-analyzer` in parallel via Task.

Apply Output Verifiability markers ([✓]/[→]/[?]) to all findings.

### Phase 3.5: Strong Inference (Bug Investigation only)

Apply Debug Investigation Protocol using Phase 2-3 findings as input.

Skip when: cause is obvious or intent is "Feature planning" / "Understanding".

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

## Verification

| Check                                     | Required |
| ----------------------------------------- | -------- |
| Findings marked with [✓]/[→]/[?] markers? | Yes      |
| Output saved to workspace/research/?      | Yes      |
| Next Steps section included?              | Yes      |
