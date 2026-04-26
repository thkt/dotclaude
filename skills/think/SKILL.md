---
name: think
description: Design exploration with SOW and Spec generation. Use when user mentions
  計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration. Do
  NOT use for codebase investigation without planning intent (use /research
  instead).
allowed-tools: Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, AskUserQuestion
model: opus
argument-hint: "[task description]"
user-invocable: true
---

# /think

Deep design exploration. Compare approaches, validate assumptions, generate SOW
and Spec.

## Rationalization Counters

| Excuse                                     | Counter                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| "Why is obvious, I'll skip it"             | Obvious to whom? Unexamined Why produces silent decisions downstream                     |
| "DA challenge is overkill for this"        | Every design has hidden assumptions. DA agent catches what self-review misses            |
| "The user's request maps directly to code" | Requests describe symptoms. Name the underlying problem before designing                 |
| "This is simple enough to skip the spec"   | Simple-looking tasks hide ambiguity. Formalization catches it before implementation does |

## Input

Task description from `$ARGUMENTS`, research context, or AskUserQuestion if empty.

## Execution

| Step | Action               | Detail                                                                    |
| ---- | -------------------- | ------------------------------------------------------------------------- |
| 0    | Why Discovery        | [references/step-0-why-discovery.md](references/step-0-why-discovery.md)  |
| 1    | Q&A Clarification    | Scope, Priority (MoSCoW), Constraints, Risks (if needed)                  |
| 2-5  | Design Exploration   | [references/step-2-5-design-exploration.md](references/step-2-5-design-exploration.md) |
| 6    | User Review          | Present design with trade-off rationale; wait for approval                |
| 6.5  | ADR Proposal         | Ask if ADR needed for technical decisions. Skip for simple features       |
| 7-8  | SOW and Spec         | [references/step-7-8-document-generation.md](references/step-7-8-document-generation.md) |
| 9-10 | Review + Decompose   | [references/step-9-10-review-decomposition.md](references/step-9-10-review-decomposition.md) |

Purpose, Users, and Success criteria are covered by Step 0 (Why Discovery).

## Output

Session ID: ${CLAUDE_SESSION_ID}

Always use this exact path — Write tool creates parent directories if absent.

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` and `spec.md`

## Verification

All steps must complete: Why established, codebase explored, ≥2 approaches
compared, DA challenge applied, design composed, user reviewed, sow.md and
spec.md generated, spec review passed, tasks decomposed (milestones + first
move + scope cut candidates).
