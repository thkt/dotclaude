---
description: Perform project research and technical investigation without implementation. Use when user mentions 調査して, 調べて, リサーチ, investigate, 分析して.
allowed-tools: Bash(tree:*), Bash(git log:*), Bash(git diff:*), Bash(wc:*), Read, Glob, Grep, LS, Task, AskUserQuestion
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

| Phase | Agent                             | Focus                                            |
| ----- | --------------------------------- | ------------------------------------------------ |
| 0     | (codemap check)                   | Read `.analysis/architecture.yaml` if exists     |
| 1     | (clarification)                   | Research intent + topic area                     |
| 2     | (intent-aware analyzer selection) | Select and run analyzers in parallel             |
| 3     | Task(Explore)                     | Detail: code paths, patterns, edge cases         |
| 3.5   | (Strong Inference)                | ≥3 hypotheses → discriminating tests → eliminate |
| 4     | (synthesis)                       | Consolidate with ✓/→/? markers                   |

Note: Invoke analyzers via `Task(subagent_type: <analyzer-name>)`, Explore via `Task(subagent_type: Explore)`.

### Phase 1: Intent Clarification

Ask via AskUserQuestion:

| Question         | Options                                              |
| ---------------- | ---------------------------------------------------- |
| Research intent  | Feature planning / Bug investigation / Understanding |
| Topic area       | Data model / API / Infrastructure / General          |
| Planning needed? | Yes → suggest `/think` after research                |

### Phase 2: Intent-Aware Parallel Analysis

Select analyzers based on Phase 1 answers, then run all selected in parallel via Task.

#### Analyzer Selection Matrix

| Intent \ Topic    | General                                 | Data model | API   | Infrastructure |
| ----------------- | --------------------------------------- | ---------- | ----- | -------------- |
| Feature planning  | architecture + code-flow + domain + api | + domain   | + api | + setup        |
| Bug investigation | architecture + code-flow                | + domain   | + api | + setup        |
| Understanding     | architecture + code-flow                | + domain   | + api | + setup        |

Legend: Each cell shows additional analyzers beyond the base set. `architecture` + `code-flow` always run.

#### Analyzer Reference

| Analyzer              | Subagent Type           | Returns                           |
| --------------------- | ----------------------- | --------------------------------- |
| architecture-analyzer | `architecture-analyzer` | Structure, deps, Mermaid diagrams |
| code-flow-analyzer    | `code-flow-analyzer`    | Execution paths, data flow        |
| domain-analyzer       | `domain-analyzer`       | Entities, relationships, rules    |
| api-analyzer          | `api-analyzer`          | Endpoints, schemas, auth          |
| setup-analyzer        | `setup-analyzer`        | Prerequisites, env vars, config   |

Apply Output Verifiability markers ([✓]/[→]/[?]) to all findings.

### Phase 3.5: Strong Inference (Bug Investigation only)

Apply Debug Investigation Protocol using Phase 2-3 findings as input.

Skip when: cause is obvious or intent is "Feature planning" / "Understanding".

## Error Handling

| Error                  | Action                                       |
| ---------------------- | -------------------------------------------- |
| Analyzer returns empty | Re-run with broader scope, note in findings  |
| Analyzer timeout       | Continue with completed analyzers            |
| All analyzers empty    | Report "Insufficient data" — do NOT conclude |

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
