---
name: think
description: "Design exploration with built-in adversarial challenge (Step 4: critic-design). Generates SOW and Spec from approaches that survive the challenge. Do NOT use for codebase investigation without planning intent (use /research instead)."
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task TaskCreate TaskList AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[task description]"
---

# /think

Deep design exploration with adversarial challenge. Compare ≥2 approaches, run critic-design against them (Step 4), and let only the surviving approaches reach Spec. Approaches are positions to be argued, not options to be picked.

## Input

Task description from `$ARGUMENTS`, research context, or AskUserQuestion if empty.

## Execution

| Step  | Action             | Detail                                                                          |
| ----- | ------------------ | ------------------------------------------------------------------------------- |
| 0     | Outcome Anchor     | Read `.claude/OUTCOME.md`; if absent, generate the stub via /outcome            |
| 1     | Why Discovery      | ${CLAUDE_SKILL_DIR}/references/step-1-why-discovery.md (assumes OUTCOME.md)     |
| 2     | Q&A Clarification  | Scope, Priority (MoSCoW), Constraints, Risks (if needed)                        |
| 3-6   | Design Exploration | ${CLAUDE_SKILL_DIR}/references/step-3-6-design-exploration.md                   |
| 7     | User Review        | Present design with trade-off rationale; wait for approval                      |
| 7.5   | ADR Proposal       | Ask if ADR needed for technical decisions. Skip for simple features             |
| 8-9   | SOW and Spec       | ${CLAUDE_SKILL_DIR}/references/step-8-9-document-generation.md                  |
| 10-11 | Review + Decompose | ${CLAUDE_SKILL_DIR}/references/step-10-11-review-decomposition.md               |
| 12    | View Generation    | Pass planning slug to `use-workflow-plan-preview`. Share returned URL with user |

## Output

Session ID: ${CLAUDE_SESSION_ID}

Always use this exact path. Write tool creates parent directories if absent.

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` and `spec.md`

## Verification

- [ ] OUTCOME.md present (Step 0)
- [ ] Why Statement established (Step 1)
- [ ] Codebase explored (Step 3)
- [ ] ≥2 approaches compared (Step 4)
- [ ] DA challenge applied (Step 5)
- [ ] Design composed (Step 6)
- [ ] User reviewed (Step 7)
- [ ] sow.md and spec.md generated (Steps 8-9)
- [ ] Spec review passed (Step 10)
- [ ] Tasks decomposed: milestones, first move, scope cut candidates (Step 11)
- [ ] View generated and `http://localhost:4321/spec/<short-slug>` URL shared (Step 12)
