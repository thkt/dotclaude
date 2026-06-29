# SOW Template

The template /think generates in the SOW / Spec Generation phase.

## Template

Replace `{...}` with design context and fill `${CLAUDE_SESSION_ID}` into `Session`. Omit any section marked optional, heading and all, when there is nothing to write.

```markdown
# SOW: {Feature Name}

Session: {session-id}

## Status

draft <!-- draft | in-progress | completed -->

## Why

| Field         | Value                                              |
| ------------- | -------------------------------------------------- |
| For           | {who needs this}                                   |
| Problem       | {evidence-based pain point}                        |
| Outcome       | {what success looks like: a result, not a feature} |
| Urgency       | {why now, not later}                               |
| Inaction cost | {cost of not doing this}                           |

## Overview

| Field     | Value                |
| --------- | -------------------- |
| Target    | {target files/areas} |
| Approach  | {approach summary}   |
| Reference | {related docs/ADRs}  |

## Background

{Current system state, technical context, prior art. What exists today.}

## Scope

### In Scope

<!-- Concrete signal that the change landed (new endpoint returns 200, UI element present, metric threshold met). -->

| Target   | Change               | Observable outcome              | Files   |
| -------- | -------------------- | ------------------------------- | ------- |
| {target} | {change description} | {what becomes observable after} | {count} |

### Out of Scope

<!-- List anything that does not contribute to the Why Outcome but might be assumed. Each entry must trace to a Why field (Problem, Outcome, Urgency) or an explicit constraint. -->

| Exclusion   | Why not (Why field / Constraint) |
| ----------- | -------------------------------- |
| {exclusion} | {reason}                         |

### Boundaries

<!-- Optional. At least one Never row is required when present. Enforced by names the mechanism. -->

| Tier      | Item                                                 | Enforced by                        |
| --------- | ---------------------------------------------------- | ---------------------------------- |
| Always    | {behavior the agent should always perform}           | {hook / spec only / manual review} |
| Ask first | {action that requires confirmation before execution} | {hook / spec only / manual review} |
| Never     | Never commit secrets                                 | shields hook                       |

## Acceptance Criteria

<!-- Each AC must trace to the Why Outcome. ACs that don't serve the Outcome are scope creep. -->

### AC-1: {title}

<!-- Concrete check a test can perform, so the downstream Spec FR produces a test without ambiguity. -->

| #   | Criterion              | Observable signal                             |
| --- | ---------------------- | --------------------------------------------- |
| 1   | {verifiable criterion} | {how to observe: HTTP 200, state X, metric Y} |
| 2   | {verifiable criterion} | {how to observe}                              |

## Implementation Plan

<!-- canonical: rules/core/PREFLIGHT.md (decomposition thresholds) -->
<!-- 1 AC = 1 Phase. Files ≥5 splits the Phase into Units. -->

### Phase 1 (AC-N): {title}

Completion signal: {observable signal that marks this Phase done, same as the AC's observable signal}

| Step | Action | Files |
| ---- | ------ | ----- |
| 1    | {step} | N     |

Files: {total unique files in this phase}

## Test Plan

<!-- State concretely what is checked and how (command to run, expected observation). Vague phrasing like "works correctly" is not allowed. -->

| Test | AC   | Target   | Verification     |
| ---- | ---- | -------- | ---------------- |
| T-1  | AC-N | {target} | {what to verify} |

## Risks

<!-- Outcome-achievement risks only. Implementation risks (build errors, dep issues) belong in /fix or PR review, not here. -->
<!-- Probability is the likelihood of the risk materializing given the current plan. Empty Mitigation with Impact HIGH is a blocker. -->

| Risk   | Outcome at risk              | Impact       | Probability  | Mitigation   |
| ------ | ---------------------------- | ------------ | ------------ | ------------ |
| {risk} | {Why Outcome or AC affected} | HIGH/MED/LOW | HIGH/MED/LOW | {mitigation} |
```
