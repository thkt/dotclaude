---
name: think
description: Design exploration with SOW and Spec generation. Do NOT use for codebase investigation without planning intent (use /research instead).
when_to_use: 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration
allowed-tools: Read Write LS Task TaskCreate TaskList AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[task description]"
---

# /think

Deep design exploration. Compare approaches, validate assumptions, generate SOW and Spec.

## Input

Task description from `$ARGUMENTS`, research context, or AskUserQuestion if empty.

## Execution

| Step | Action             | Detail                                                              |
| ---- | ------------------ | ------------------------------------------------------------------- |
| 0    | Why Discovery      | ${CLAUDE_SKILL_DIR}/references/step-0-why-discovery.md              |
| 1    | Q&A Clarification  | Scope, Priority (MoSCoW), Constraints, Risks (if needed)            |
| 2-5  | Design Exploration | ${CLAUDE_SKILL_DIR}/references/step-2-5-design-exploration.md       |
| 6    | User Review        | Present design with trade-off rationale; wait for approval          |
| 6.5  | ADR Proposal       | Ask if ADR needed for technical decisions. Skip for simple features |
| 7-8  | SOW and Spec       | ${CLAUDE_SKILL_DIR}/references/step-7-8-document-generation.md      |
| 9-10 | Review + Decompose | ${CLAUDE_SKILL_DIR}/references/step-9-10-review-decomposition.md    |

## Output

Session ID: ${CLAUDE_SESSION_ID}

Always use this exact path. Write tool creates parent directories if absent.

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` and `spec.md`

## Verification

- [ ] Why Statement established (Step 0)
- [ ] Codebase explored (Step 2)
- [ ] ≥2 approaches compared (Step 3)
- [ ] DA challenge applied (Step 4)
- [ ] Design composed (Step 5)
- [ ] User reviewed (Step 6)
- [ ] sow.md and spec.md generated (Steps 7-8)
- [ ] Spec review passed (Step 9)
- [ ] Tasks decomposed: milestones, first move, scope cut candidates (Step 10)
