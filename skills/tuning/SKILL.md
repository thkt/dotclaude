---
name: tuning
description: Empirical prompt tuning loop. Dispatch fresh subagents against skill/agent/command prompts, collect ambiguities, patch one at a time.
when_to_use: skill チューニング, agent チューニング, command チューニング, プロンプト再現性, empirical prompt tuning, 暗黙知排除, 再現性テスト
allowed-tools: Read Edit Write Task Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target-path]"
---

# Tuning - Empirical Prompt Tuning

## Principle

Prompt authors are the worst readers of their own prompts. They fill tacit knowledge without noticing. Only an independent executor AI, reading the prompt cold, can surface missing context. The loop is TDD-shaped: the executor is the test, the prompt is the production code.

## Target

| Target        | Path                                          | Dispatch                     |
| ------------- | --------------------------------------------- | ---------------------------- |
| Skill         | ${CLAUDE_SKILL_DIR}/../<name>/SKILL.md        | Task + general-purpose agent |
| Agent         | ${CLAUDE_SKILL_DIR}/../../agents/**/<name>.md | Task + subagent_type=<name>  |
| Slash command | ${CLAUDE_SKILL_DIR}/../../commands/<name>.md  | Task + general-purpose agent |

## Loop

1. Fix scenarios and requirements up front, freeze them
2. Dispatch fresh subagents in parallel (no reuse)
3. Collect reports: requirements / ambiguities / discretionary fills / retries
4. Patch ONE ambiguity per iteration (minimal edit)
5. Re-dispatch with fresh subagents until a stop condition fires

One iteration, one theme. Multiple patches in one round breaks attribution.

## Scenario Design

| Type     | Count | Purpose                                  |
| -------- | ----- | ---------------------------------------- |
| Median   | 1     | Typical happy path                       |
| Edge     | 1-2   | Boundary conditions, unusual inputs      |
| Hold-out | 1     | Never used for tuning, overfitting check |

Scenarios stay frozen across iterations. Tuning scenarios to match prompt changes hides real ambiguities.

## Requirements Checklist

Every scenario carries a checklist. Tag at least one item `[critical]`. A run is successful only when every `[critical]` item is met. Without critical tags, success collapses into "50% everywhere" and the next patch target becomes invisible.

## Subagent Prompt Template

```text
You are the executor reading <target prompt name> cold.

## Target Prompt
<prompt body or file path>

## Scenario
<one-paragraph situation>

## Requirements Checklist
1. [critical] <minimum-line item>
2. <regular item>
...

## Task
1. Follow the target prompt against the scenario and produce the deliverable
2. Return a report in the structure below at the end

## Report Structure
- Deliverable: <output or execution summary>
- Requirement check: pass / fail / partial (with reasoning) per item
- Ambiguities: stall points, wording that was hard to interpret
- Discretionary fills: gaps filled by your own judgment
- Retries: how many times you redid the same decision and why
```

## Stop Conditions

| Outcome   | Criteria                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Converged | 2 consecutive runs with new ambiguities 0, accuracy ±3pt, steps ±10%, duration ±15%, no hold-out regression |
| Diverged  | New ambiguities do not drop after 3+ iterations. Rewrite the structure instead of patching                  |
| Cut off   | Improvement cost > remaining importance. 90→100 hits diminishing returns, candidate for cutoff              |

## Metrics

Task tool return values append `<usage>total_tokens: N, tool_uses: M, duration_ms: D</usage>`. Capture this every run and compare across iterations. "Feels faster" is not a comparable metric.

### tool_uses Diagnosis

Compare `tool_uses` across scenarios. If 4 scenarios sit at 1-3 and 1 spikes to 15+, that scenario is digging through references, signaling low self-containment. Add an inline minimal example and a "when to read references" guideline to the body to bring it down. Even at 100% accuracy, structural gaps surface in `tool_uses`.

## Common Failures

| Failure                         | Fix                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Task tool not dispatched        | Tell the subagent explicitly to spawn another via Task tool                    |
| `<usage>` block missing         | Force the report structure in the dispatch prompt                              |
| Rate limit (529/overloaded)     | Drop parallelism from 3 to 1, or wait 30s and re-dispatch                      |
| Parent context token exhaustion | Spawn a fresh session dedicated to evaluation                                  |
| Scenario echoes the body        | Redesign median + edge. Edge cases are mandatory                               |
| Same AI reused                  | Always fresh dispatch. Do not continue via SendMessage                         |
| Multiple patches per iteration  | One theme per iteration. Otherwise attribution is lost                         |
| Decision based on metrics only  | Qualitative (ambiguities, discretionary fills) leads. Quantitative supports it |
| Vague patch by axis name        | Force the subagent to cite the threshold text from the rubric                  |

## Do Not Apply

| Case                                     | Reason                                           |
| ---------------------------------------- | ------------------------------------------------ |
| One-shot disposable prompt               | Iteration cost does not pay off                  |
| Preserving the author's subjective taste | Conflicts with the goal of removing author bias  |
| Self-rereading as a substitute           | The author's tacit knowledge slips in undetected |

## Handoff

Do not discard the iteration log in place. Keep it as `TUNING_LOG.md` next to the target prompt. Record score trends, scenarios, and patch theme per iteration. It becomes the starting point for the next tuning round.

## Related

| Skill                           | Relation                                                                 |
| ------------------------------- | ------------------------------------------------------------------------ |
| use-workflow-tdd-cycle          | Applies the same Red-Green-Refactor cycle to prompts                     |
| use-context-root-cause-analysis | Drills into ambiguities (5 Whys) to find structural gaps                 |
| use-workflow-spec-validation    | Spec consistency is separate; this one measures prompt reproducibility   |
| assert                          | `/assert` is the Ready/NotReady gate for code outcomes. Different target |
| challenge                       | Adversarial gap-hunting is separate. This is an iterative patch loop     |
