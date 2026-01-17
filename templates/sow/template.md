# SOW: [Feature Name]

Created: [YYYY-MM-DD]
Status: draft <!-- draft | in-progress | completed -->

## Executive Summary

[1-2 sentence overview]

Scope: [area1, area2, area3]

## Problem Analysis

| ID    | Issue   | Evidence    | Confidence |
| ----- | ------- | ----------- | ---------- |
| I-001 | [issue] | [file:line] | [✓/→/?]    |

## Assumptions

| ID    | Type       | Description          | Confidence |
| ----- | ---------- | -------------------- | ---------- |
| A-001 | fact       | [verified]           | [✓]        |
| A-002 | assumption | [working]            | [→]        |
| A-003 | unknown    | [needs verification] | [?]        |

## Solution Design

| Phase | Description | Confidence |
| ----- | ----------- | ---------- |
| 1     | [approach]  | [✓/→/?]    |

Alternatives considered: [Option A (ADOPT), Option B (REJECT) - reasoning]

## Acceptance Criteria

Format: `WHEN/IF/WHILE [trigger] THEN/THE system SHALL [action]`

| ID     | Description                                     | Validates | Confidence |
| ------ | ----------------------------------------------- | --------- | ---------- |
| AC-001 | WHEN [user action] THEN system SHALL [response] | I-001     | [✓/→/?]    |
| AC-002 | IF [error condition] THEN system SHALL [handle] | I-002     | [✓/→/?]    |

## Test Plan

| Priority | Type | Description | Validates |
| -------- | ---- | ----------- | --------- |
| HIGH     | unit | [test]      | AC-001    |

## Implementation Plan

| Phase | Steps   | Validates |
| ----- | ------- | --------- |
| 1     | [steps] | AC-001    |

## Success Metrics

| Metric   | Target   | Validates |
| -------- | -------- | --------- |
| [metric] | [target] | AC-001    |

## Risks

| ID    | Risk   | Impact       | Mitigation   |
| ----- | ------ | ------------ | ------------ |
| R-001 | [risk] | HIGH/MED/LOW | [mitigation] |

## Verification Checklist

- [ ] Research/investigation completed
- [ ] Impact on existing structure confirmed
- [ ] Backup of related files obtained (if needed)

## References

| Type     | Path     |
| -------- | -------- |
| research | [path]   |
| IDR      | ./idr.md |
