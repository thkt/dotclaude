# OUTCOME

Where each repository's outcome state is defined. Concretizes CLAUDE.md's Foundation Outcome-driven principle at the repository level.

This file is the rule definition (what OUTCOME.md is, how it operates). The actual instance lives at `.claude/OUTCOME.md` in each repository.

## Why this exists

CLAUDE.md's Foundation declares Outcome-driven, but per-repository outcome state is left vague in practice. Vague outcomes contaminate every downstream decision (scope, priority, what to cut). OUTCOME.md converts vague outcomes into visible state. The act of writing it is the discovery moment.

## Location

`.claude/OUTCOME.md` in each repository.

Keep it separable from CLAUDE.md by placing it under the meta layer. Do not put it at the repo root.

## What is an outcome

An outcome is a state of being. It describes how the world looks when this project is in its done condition. The world includes any subject the project changes. Such a subject is a human user, an AI agent that consumes the project, or the system the project gates.

Behavior is the primary axis. Time, error rate, and value are Indicators that corroborate the Behavior. A metric like "error rate < 0.1%" becomes an outcome by attaching the behavioral consequence ("agents complete edits without retry because error rate stays under 0.1%").

The subject of Behavior is one of the following.

| Subject    | Examples                                                         |
| ---------- | ---------------------------------------------------------------- |
| Human user | Developer, end user, operator                                    |
| AI agent   | Claude Code, AI assistant consuming the project                  |
| System     | Downstream tool, pipeline, service, or process the project gates |

## Outcome test

Run each candidate outcome statement through these checks. If any fails, rewrite.

| Check                      | Pass condition                                                                |
| -------------------------- | ----------------------------------------------------------------------------- |
| Subject named              | The statement names a subject (human / AI agent / system) whose state changes |
| Implementation-independent | The statement still holds if the implementation is rewritten end to end       |
| Done state                 | The statement describes the state in the done condition                       |
| Observable                 | An external observer can verify the state without reading the source          |

## Content

Three sections. Outcome state has three slots. They are optional opening prose for the project's reason for being, Behavior as the primary axis, and optional Indicators that corroborate the Behavior. Behavior follows rules/conventions/VAGUE_TERMS.md strictly. Opening prose and Indicators may carry aspirational direction (vague terms permitted only in these two slots).

| Section       | What                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outcome state | Optional opening prose for the project's reason for being. Behavior in the done state (required, ≥1). Indicators (Time / Error rate / Value) optional |
| Non-goals     | Explicitly out of scope                                                                                                                               |
| Constraints   | Immovable technical, legal, or organizational limits                                                                                                  |

## Relationship with CLAUDE.md

Additive layer. No migration mandate for existing CLAUDE.md files. Repositories that already mix "why we exist" into CLAUDE.md (kiku, mimi, miyo, tally, okr-dashboard) extract the why portion into OUTCOME.md when the author next touches them.

| File       | Scope                 | Question it answers                                |
| ---------- | --------------------- | -------------------------------------------------- |
| OUTCOME.md | Why exists, what done | Why does this repo exist; what counts as done      |
| CLAUDE.md  | How to work           | How do we work here (stack, commands, conventions) |
| ADR        | Technical decisions   | Why this technical choice                          |
| SOW        | Task scope            | What is the scope of this task                     |
| Spec       | Feature spec          | What is the specification of this feature          |

## Workflow touchpoints

Active set is /think, /issue, /code, /fix, /research, /assert. /assert reads OUTCOME.md because outcome-based assertion needs the outcome it is asserting against; the gate decision derives from "does this change move the project toward the Behavior in the done state". /audit and /polish remain out of scope because they operate on code quality, not outcome verification. Revisit if scope drift detection becomes necessary for them too.

| Skill     | When                           | Use                                                                                                                 |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| /think    | Step before Why Discovery      | Read OUTCOME.md as a prerequisite for the Why Statement                                                             |
| /issue    | Issue body generation          | Check against OUTCOME.md; warn in body if the issue steps into non-goals                                            |
| /code     | Alongside SOW Context          | Feed outcome state into Scope Guard                                                                                 |
| /fix      | Before Triage                  | Confirm the fix lives inside the outcome; escalate to /code if outside                                              |
| /research | Investigation scope set        | Explicitly confirm before investigating non-goal areas                                                              |
| /assert   | Pre-flight + Phase 3 + Phase 4 | Read as intent source for Intent Assertion; feed Behavior / Non-goals / Constraints to enhancer-evidence as context |

## Behavior when absent

When `.claude/OUTCOME.md` is missing and one of the touchpoint workflows starts, the workflow generates the stub interactively before proceeding. Hard-stop is rejected because it makes new-repo bootstrap painful enough that the rule gets deleted. Warn-and-proceed is rejected because it lets work continue against a vague outcome. A file with empty Behavior or all sections marked TBD is treated as absent on the next workflow start.

| Step | Action                                                                                       |
| ---- | -------------------------------------------------------------------------------------------- |
| 1    | Detect OUTCOME.md absence                                                                    |
| 2    | Collect Behavior (≥1, with subject named), Non-goals, Constraints via AskUserQuestion (3 Qs) |
| 3    | Run each Behavior through the Outcome test (above) before writing                            |
| 4    | Read `~/.claude/rules/core/templates/outcome.md`, fill the template, then Write to `.claude/OUTCOME.md` |
| 5    | Resume the originating workflow                                                              |

## Template and examples

The stub template and three project-shape examples live in `templates/outcome.md`, kept out of always-loaded context. The Behavior when absent flow (step 4) reads it during stub generation.

## Update triggers

Update commits should be standalone so the history of outcome changes is readable.

| Trigger               | Action                                                      |
| --------------------- | ----------------------------------------------------------- |
| Outcome state reached | Roll the filled Behavior and Indicators into the next phase |
| Non-goals changed     | Update Non-goals                                            |
| Constraints changed   | Update Constraints                                          |
| Six months elapsed    | Review all sections                                         |
