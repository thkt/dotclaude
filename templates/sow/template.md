# SOW: [Feature Name]

Session: [session-id]

## Status

draft <!-- draft | in-progress | completed -->

## Why

| Field         | Value                                               |
| ------------- | --------------------------------------------------- |
| For           | [who needs this]                                    |
| Problem       | [evidence-based pain point]                         |
| Outcome       | [what success looks like — a result, not a feature] |
| Urgency       | [why now, not later]                                |
| Inaction cost | [cost of not doing this]                            |

## Overview

| Field     | Value                |
| --------- | -------------------- |
| Target    | [target files/areas] |
| Approach  | [approach summary]   |
| Reference | [related docs/ADRs]  |

## Background

[Current system state, technical context, prior art. What exists today.]

## Scope

### In Scope

| Target   | Change               | Observable outcome                  | Files   |
| -------- | -------------------- | ----------------------------------- | ------- |
| [target] | [change description] | [what becomes observable after]     | [count] |

Observable outcome: concrete signal that the change landed (new endpoint returns 200, UI element present, metric threshold met). Enables Spec traceback.

### Out of Scope

| Exclusion   | Why not (Why field / Constraint) |
| ----------- | -------------------------------- |
| [exclusion] | [reason]                         |

### YAGNI Checklist

Check only if needed (unchecked = excluded):

- [ ] Complex permission management
- [ ] Analytics/monitoring dashboards
- [ ] Caching layers
- [ ] Multi-tenant / API versioning
- [ ] Real-time notifications
- [ ] Batch processing / scheduled jobs

## Acceptance Criteria

<!-- Each AC must trace to the Why Outcome. ACs that don't serve the Outcome are scope creep. -->

### AC-1: [title]

| # | Criterion              | Observable signal                     |
| - | ---------------------- | ------------------------------------- |
| 1 | [verifiable criterion] | [how to observe: HTTP 200, state X, metric Y] |
| 2 | [verifiable criterion] | [how to observe]                      |

Observable signal: concrete check a test can perform. Enables downstream Spec FR to produce a test without ambiguity.

## Implementation Plan

<!-- Phases with Files ≥5 must be split into Units (PREFLIGHT threshold) -->

### Phase 1: [title]

| Step | Action | Files |
| ---- | ------ | ----- |
| 1    | [step] | N     |

Files: [total unique files in this phase]

## Test Plan

| Test | AC   | Target   | Verification     |
| ---- | ---- | -------- | ---------------- |
| T-1  | AC-N | [target] | [what to verify] |

## Risks

| Risk   | Impact       | Probability  | Mitigation   |
| ------ | ------------ | ------------ | ------------ |
| [risk] | HIGH/MED/LOW | HIGH/MED/LOW | [mitigation] |

Probability: likelihood of the risk materializing given current plan. Used with Impact to prioritize Mitigation. Empty Mitigation with Impact HIGH is a blocker.
