---
name: think
description: Design exploration with adversarial critique by critic-design. Assembles the surviving approach into a structured plan, self-checks it, and returns it to the caller. The issue's Plan section is the plan's only persistent home. Do NOT use for codebase investigation without planning intent (use /research instead).
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[task description]"
---

# /think - Design Exploration

Compare 2+ approaches, subject them to `critic-design` critique, and let only the surviving approach reach the structured plan. Return the plan in conversation, not in files; persistence is left to `/issue`'s Plan write-out.

## Input

`$ARGUMENTS` carries the task description and research context. If empty, confirm with the user via AskUserQuestion. The first line is the task title.

## Phase 1: Outcome Exploration

Read `.claude/OUTCOME.md`. If it does not exist, generate it via `/outcome`.

Establish the Why before designing. Who needs this, what pain exists and what is its evidence, what counts as success, why now, and what happens if we don't. Pin these 5 points down via AskUserQuestion until they are readable from $ARGUMENTS and the conversation. Pin down scope / priority / constraints / risks at the same time if unsettled; skip when already settled.

## Phase 2: Design Exploration

Read the relevant code first to grasp patterns / constraints / architecture / prior art. Search `.claude/workspace/research/` with task keywords via `bfs`, and read any matching research output.

### Approach Generation

Generate 2+ distinct approaches from the following perspectives. When approaches contain independent technical decisions, present each decision as a separate choice question with a recommendation and trade-offs. Bundle only tightly coupled decisions.

- Pragmatist asks for the simplest thing that works
- Architect asks for what is extensible and well-structured
- DX Advocate asks for what is best for developer / user experience

### Design

1. Launch `critic-design` on the generated approaches. Include the task title verbatim in the spawn prompt, and have it return a single JSON object `{ verdict: "GO" | "NO-GO", weaknesses: string[], actionable: string[] }`
2. If the verdict is NO-GO, resolve blockers inline before proceeding. Fix the approach, or relaunch the critic. Present the weakness-filtered design to the user with trade-off rationale, and wait for approval
3. After approval, ask whether the technical decision needs an ADR. Skip for simple features

## Phase 3: Plan Generation

1. Decompose the approved design into units. A unit is an independently implementable bundle of outcome. Serialize them in implementation order into PLAN_SCHEMA-equivalent JSON `{ test_command, units: [{ id, goal, contract, files: string[], tests: [{ id, name }] }] }`. Assign sequential ids in U-001 / T-001 format, with T-NNN unique across the whole plan
2. Write contract and tests[].name per the authoring rules in `${CLAUDE_SKILL_DIR}/../issue/references/plan-section.md`
3. If a unit touches 5 or more unique files, re-decompose it into smaller units along outcomes and confirm the new unit composition with the user. Candidates carved out of scope stay out of the plan and go to backlog candidates
4. Self-check the serialized plan. Look for missing required fields, duplicate ids, and empty units / tests / goal / contract, and fix them. Final validation is performed by build's Load validate

## Output

Return the following to the caller in conversation.

| Item               | Content                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| ready              | true when the plan passed the self-check and no undecided points remain                        |
| plan               | The self-checked structured plan                                                               |
| blockers           | Causes of ready = false that need a user decision                                              |
| backlog candidates | Candidates carved out of scope. "none" if none                                                 |
| design summary     | Adopted approach, compared approaches, the `critic-design` verdict, ADR needed or not          |
