---
name: think
description: Design exploration with adversarial critique by critic-design. Assembles the surviving approach into a structured plan, self-checks it, and returns it to the caller. The issue's Plan section is the plan's only persistent home. Do NOT use for codebase investigation without planning intent (use /research instead).
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[task description]"
---

# /think - Design Exploration

Deep design exploration with adversarial critique by `critic-design`. Compare 2+ approaches, subject them to critique, and let only the surviving approach reach the structured plan. Treat approaches as candidates to be verified against critique, not merely options to pick from. The plan is returned to the caller in conversation, not written to files. Its only persistent home is the issue's `## Plan` section written by `/issue`.

## Input

`$ARGUMENTS` carries the task description and research context. If empty, confirm with the user via AskUserQuestion. The first line of $ARGUMENTS is the task title; pass that first line verbatim, unparaphrased, into the `critic-design` spawn prompt.

## Phase 1: Outcome Exploration

Read `.claude/OUTCOME.md`. If it does not exist, generate it via `/outcome`.

Establish the Why before designing. Who needs this, what pain exists (and its evidence), what counts as success, why now, and what happens if we don't. Pin these 5 points down via AskUserQuestion until they are readable from $ARGUMENTS and the conversation. Pin down scope / priority / constraints / risks at the same time if unsettled; skip when already settled.

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

1. Decompose the approved design into units (an independently implementable bundle of outcome) and serialize them in implementation order into PLAN_SCHEMA-equivalent JSON (`{ test_command, units: [{ id, goal, contract, files: string[], tests: [{ id, name }] }] }`). The listed order is the implementation order. Assign sequential ids in U-001 / T-001 format, with T-NNN unique across the whole plan
2. Write each contract by selection, not generation. A citation of a real source (code path + public symbol > docs/wiki page > deep link into the pinned version's official docs) plus a one-line intent. For a new shape with no citable source, do not invent a signature; keep the one intent line and leave the shape to implementation
3. Make each tests[].name a one-line statement of condition + expected result (it becomes the test name verbatim). Do not elaborate given / when / then; the statement itself pins the behavior
4. If a unit touches 5 or more unique files, re-decompose it into smaller units along outcomes and confirm the new unit composition with the user. Candidates carved out of scope stay out of the plan and go to backlog candidates
5. Self-check the serialized plan (missing required fields, duplicate ids, empty units / tests / goal / contract). Final validation is performed by build's Load validate

## Output

Return the following to the caller in conversation.

| Item               | Content                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| ready              | true when the plan passed the self-check and no undecided points remain                        |
| plan               | The validated structured plan (PLAN_SCHEMA JSON)                                               |
| blockers           | Causes of ready = false that need a user decision. The caller settles each via AskUserQuestion |
| backlog candidates | Candidates carved out of scope (they feed the issue's `## Backlog candidates`). `none` if none |
| design summary     | Adopted approach, compared approaches, `critic-design` verdicts, ADR needed or not             |
