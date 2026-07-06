---
name: think
description: Design exploration with adversarial critique by critic-design. Assembles the surviving approach into a structured plan, validates it via plan-gate, and returns it to the caller. The issue's Plan section is the plan's only persistent home. Do NOT use for codebase investigation without planning intent (use /research instead).
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash(python3:*)
model: opus
argument-hint: "[task description]"
---

# /think - Design Exploration

Deep design exploration with adversarial critique by `critic-design`. Compare 2+ approaches, subject them to critique, and let only the surviving approach reach the structured plan. Treat approaches as candidates to be verified against critique, not merely options to pick from. The plan is returned to the caller in conversation, not written to files. Its only persistent home is the issue's `## Plan` section written by `/issue`.

## Input

`$ARGUMENTS` carries the task description and research context. If empty, confirm with the user via AskUserQuestion. The first line of $ARGUMENTS is the task title; pass that first line verbatim, unparaphrased, wherever a verbatim title is required (the `critic-design` spawn prompt and plan-gate `--title`).

## Phase 1: Outcome Exploration

Read `.claude/OUTCOME.md`. If it does not exist, generate it via `/outcome`.

### Why

Establish the outcome to achieve first. Answer the following 5 questions and settle them as the Why. Do not proceed to the next step until all 5 are clear. When an item is vague or assumed, pin it down via AskUserQuestion.

- Who needs this?
- What pain exists? What is the evidence?
- What measurable result counts as success?
- Why now?
- What happens if we don't?

### Scope and Risks

If unresolved by `.claude/OUTCOME.md` and the Why, pin down scope / priority / constraints / risks via AskUserQuestion. Skip when already settled.

## Phase 2: Design Exploration

Read the relevant code first to grasp patterns / constraints / architecture / prior art. Search `.claude/workspace/research/` with task keywords via `bfs`, and if matching research output exists, read it to inherit prior context.

### Approach Generation

Generate 2+ distinct approaches from the following perspectives. When approaches contain independent technical decisions, present each decision as a separate choice question with a recommendation and trade-offs. Bundle only tightly coupled decisions.

- Pragmatist asks for the simplest thing that works
- Architect asks for what is extensible and well-structured
- DX Advocate asks for what is best for developer / user experience

### Design

1. Launch `critic-design` on the generated approaches and receive the verdict table and actionable items. Include the task title verbatim in the spawn prompt. Instruct it to return its result as a single JSON object `{ verdict: "GO" | "NO-GO", weaknesses: string[], actionable: string[] }`
2. If the verdict is NO-GO, resolve blockers inline before proceeding (fix the approach or relaunch the critic). Present the findings-filtered design to the user with trade-off rationale, and wait for approval
3. After approval, ask whether the technical decision needs an ADR. Skip for simple features

## Phase 3: Plan Generation

1. Decompose the approved design into units (an independently implementable bundle of outcome) and serialize them into PLAN_SCHEMA-equivalent JSON (`{ test_command, units: [{ id, goal, contract, files: string[], depends_on: string[], tests: [{ id, name, given, when, then }] }] }`)
2. Assign sequential ids in U-001 / T-001 format. Keep T-NNN unique across the whole plan. When units depend on each other, fill depends_on. Later sessions use it to decide implementation order and parallelism
3. Count unique files per unit; if 5 or more, re-decompose it into smaller units. Cut along outcomes, not implementation steps. Since this changes the contract, confirm the new unit composition with the user
4. Candidates carved out of scope stay out of the plan and go to backlog candidates
5. Pipe the JSON on stdin to `python3 ${CLAUDE_SKILL_DIR}/../../hooks/veto/veto.py plan-gate --title "<task title verbatim>"`. Pass the task title literally without paraphrasing. The script performs normalization
6. Resolve the errors returned by the gate yourself and re-run

## Output

Return the following to the caller in conversation.

| Item               | Content                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| ready              | true when plan-gate passed and no undecided points remain                                      |
| plan               | The validated structured plan (PLAN_SCHEMA JSON)                                               |
| blockers           | Causes of ready = false that need a user decision. The caller settles each via AskUserQuestion |
| backlog candidates | Candidates carved out of scope (they feed the issue's `## Backlog candidates`). `none` if none |
| design summary     | Adopted approach, compared approaches, `critic-design` verdicts, ADR needed or not             |

## Completion Criteria

Do not finish until every item is met. For items that cannot be met, present the reason to the user.

- [ ] OUTCOME.md exists
- [ ] Why established
- [ ] 2+ approaches compared
- [ ] Adversarial critique (critic-design) applied
- [ ] Design reviewed and approved by the user
- [ ] Structured plan passed plan-gate and was returned to the caller
