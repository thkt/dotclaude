---
name: think
description: Design exploration with adversarial critique by critic-design. Assembles the surviving approach into a structured plan, self-checks it, and returns it to the caller. The issue's Plan section is the plan's only persistent home. Do NOT use for codebase investigation without planning intent (use /research instead).
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash(test:*)
model: opus
argument-hint: "[task description]"
---

# /think - Design Exploration

Compare 2+ approaches, subject them to `critic-design` critique, and let only the surviving approach reach the structured plan. Write the plan to a draft file following the templates/plan.md skeleton and also return it in conversation. Persistence happens when `/issue` transfers it into the issue's Plan section.

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
2. Write contract and tests[].name per the authoring rules below
3. If a unit touches 5 or more unique files, re-decompose it into smaller units along outcomes and confirm the new unit composition with the user. Candidates carved out of scope stay out of the plan and go to backlog candidates
4. Self-check the serialized plan. Look for missing required fields, duplicate ids, and empty units / tests / goal / contract, and fix them. Final validation is performed by build's Load validate
5. Run the pre-writeout verification, then write the passing plan following the `${CLAUDE_SKILL_DIR}/templates/plan.md` skeleton to `.claude/workspace/planning/YYYY-MM-DD-<slug>.plan.md`. Derive the lowercase hyphenated slug from the task title. Include both the `## Plan` and `## Backlog candidates` sections

### Contract authoring rules

Select, do not generate. Never sketch behavior in prose or invent new code fragments; a contract is a citation plus an intent. A citation is verifiable, while a generated sketch is not.

1. Pick the citation in this priority order: an existing shape in the codebase > a docs/wiki page > a deep link to the API in the pinned version's official docs. Write a code shape as path + public symbol under the same stable-anchor rules as Preconditions. External-library citations follow SOURCING.md
2. Add what to follow and what to change relative to the citation as the one intent line. For a new shape with no citable source, do not invent a signature; keep the one intent line and leave the shape to implementation. Behavior is pinned by the acceptance tests
3. Cited paths + symbols also go into `### Preconditions`, putting them under pre-writeout verification and build's Revalidate

### Precondition authoring rules

Apply these 5 rules to `### Preconditions`.

1. List existing dependencies only. Files newly created by a unit are never listed as preconditions
2. Anchors are limited to a single stable anchor, one exported / public symbol name, that `ugrep -F` matches as a literal fixed string. Do not anchor on private implementation details, comment strings, line numbers, or a slash-joined list of symbols; none of those match under `ugrep -F`
3. When no stable symbol exists, write the line as path only
4. Each line takes one of two forms: path only, or path + stable anchor
5. Paths are repo-root-relative. A path that drops a repo prefix like `workspace/` fails verification

### Pre-writeout verification

Before writing out the draft, verify from the same repository root as the build workflow's Revalidate.

1. Verify each `### Preconditions` line: paths via `test -f <path>`, anchors via `ugrep -F '<pattern>' <path>`. Fix or drop any failing line
2. Verify every `units[].files` entry that refers to an existing file with `test -f <path>`, and fix any failing path
3. If even one unit lists an existing file in `files`, the `### Preconditions` subsection needs at least one line. Treat an empty or absent subsection as a failure, and add one precondition line anchoring the load-bearing dependency
4. Check for overflow against the line-count rules in templates/plan.md

## Output

Return the following to the caller in conversation.

| Item               | Content                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| ready              | true when the plan passed the self-check and no undecided points remain               |
| plan               | The self-checked structured plan                                                      |
| plan file          | Path of the written `.plan.md`                                                        |
| blockers           | Causes of ready = false that need a user decision                                     |
| backlog candidates | Candidates carved out of scope. "none" if none                                        |
| design summary     | Adopted approach, compared approaches, the `critic-design` verdict, ADR needed or not |
