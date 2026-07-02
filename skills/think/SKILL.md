---
name: think
description: Design exploration with an adversarial challenge by critic-design. Generates SOW and Spec from the surviving approaches. Do NOT use for codebase investigation without planning intent (use /research instead).
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[task description]"
---

# /think - Design Exploration

Deep design exploration with adversarial challenge. Compare ≥2 approaches, put them through critique by `critic-design`, and let only the surviving approaches reach Spec. An approach is not merely an option to pick but something tested for whether it withstands critique.

## Input

Receive the task description and research context from `$ARGUMENTS`. If empty, confirm with the user via AskUserQuestion.

## Phase 1: Outcome Reference

Read `.claude/OUTCOME.md`. If absent, generate the stub via `/outcome`.

## Phase 2: Outcome Discovery

### Why

Establish the outcome to achieve first. Each answer below maps to the matching field of the Why section in `${CLAUDE_SKILL_DIR}/templates/sow.md`.

| Question                         | Field         |
| -------------------------------- | ------------- |
| Who needs this?                  | For           |
| What pain exists? On what basis? | Problem       |
| What is success, measured how?   | Outcome       |
| Why do it now?                   | Urgency       |
| What if we don't?                | Inaction cost |

Do not proceed to the next step until all 5 fields are clear. Resolve any vague or assumed field through dialogue.

- Ask one question per message, with a recommended answer and its reasoning.
- Explore the codebase first; ask only what the code cannot resolve.
- Offer contrasting framings to help the user articulate what they mean.
- Concretize vague, high-abstraction outcomes by pinning down the target and how it is measured.

### Scope and Risks

If left undetermined by `.claude/OUTCOME.md` and the Why, clarify scope, priority, constraints, and risks via AskUserQuestion. The answers map to the Scope and Risks of `${CLAUDE_SKILL_DIR}/templates/sow.md`. Omit if already determined.

## Phase 3: Design Exploration

First read relevant code to understand patterns / constraints / architecture / prior art. Search `.claude/workspace/research/` by task keyword with `bfs`; if matching research output exists, read it to inherit prior context.

### Approach Generation

Generate ≥2 distinct approaches from the perspectives below. When approaches contain independent technical decisions (e.g., framework, state management, API style), present each decision as a separate choice question with recommendation and impact. Bundle only decisions that are tightly coupled.

| Perspective | Question                                   |
| ----------- | ------------------------------------------ |
| Pragmatist  | What's the simplest solution that works?   |
| Architect   | What's extensible and well-structured?     |
| DX Advocate | What's best for developer/user experience? |

### Design

1. Spawn `critic-design` against the generated approaches and take its verdict table and actionable items
2. Present the design filtered by the findings to the user with trade-off rationale and wait for approval
3. Once approved, ask whether the technical decisions warrant an ADR. Skip for simple features

## Phase 4: SOW / Spec Generation

### SOW

- Fill the template `${CLAUDE_SKILL_DIR}/templates/sow.md` from the design context and write to `.claude/workspace/planning/YYYY-MM-DD-{feature}/sow.md`
- IDs use the AC-N format. Follow the section-specific rules in the template's notes

### Spec

- Generate the template `${CLAUDE_SKILL_DIR}/templates/spec.md` from the SOW and write to `.claude/workspace/planning/{same-dir}/spec.md`
- IDs use the FR-001 / T-001 / NFR-001 format. Follow the section-specific rules in the template's notes
- For multi-phase work, fill the Implementation table's Depends; it is the handoff for concurrent scheduling in a later session

### Prose Review

After generation, review sow.md and spec.md inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md` and the empty-phrase file matching the body language (`${CLAUDE_SKILL_DIR}/references/phrases.ja.md` for Japanese, `${CLAUDE_SKILL_DIR}/references/phrases.en.md` for English).

## Phase 5: Scope Adjustment

Count unique files per Phase; when 5 or more, split into independent Units (each with own SOW / Spec). This re-decomposes the AC into smaller outcome units rather than slicing the implementation, and is a contract change, so confirm the new ACs with the user.

## Completion Criteria

Not done until all items are satisfied. For any item you cannot satisfy, present the reason to the user.

- [ ] OUTCOME.md present
- [ ] Why Statement established
- [ ] ≥2 approaches compared
- [ ] Adversarial challenge (critic-design) applied
- [ ] Design reviewed and approved by the user
- [ ] sow.md and spec.md generated
