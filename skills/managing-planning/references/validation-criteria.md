# Validation Criteria

SOW acceptance criteria validation process.

## Purpose

Verify implementation matches SOW acceptance criteria and update IDR.

## Validation Flow

```text
/validate
    │
    ├─ Detect SOW and IDR
    │
    ├─ Read Acceptance Criteria
    │
    ├─ For each AC:
    │     ├─ Check implementation evidence
    │     ├─ Verify tests exist
    │     └─ Determine PASS/FAIL
    │
    ├─ Generate validation report
    │
    └─ Update IDR with /validate section
```

## AC Validation Checklist

For each acceptance criterion:

| Check       | Question                     |
| ----------- | ---------------------------- |
| Implemented | Does code implement this AC? |
| Tested      | Do tests validate this AC?   |
| Documented  | Is behavior documented?      |
| Reviewed    | Was it reviewed in /audit?   |

## Confidence Assessment

| Result    | Confidence   | Action             |
| --------- | ------------ | ------------------ |
| All PASS  | [C: 0.9+]    | Ready for release  |
| Some WARN | [C: 0.7-0.9] | Review warnings    |
| Any FAIL  | [C: <0.7]    | Fix before release |

## Validation Report Format

```markdown
## /validate - [timestamp]

### SOW Acceptance Criteria Validation

| AC     | Description    | Status  | Evidence             |
| ------ | -------------- | ------- | -------------------- |
| AC-001 | Feature works  | ✅ PASS | test:auth.test.ts:45 |
| AC-002 | Performance OK | ⚠️ WARN | 95ms (target: 100ms) |
| AC-003 | Error handling | ❌ FAIL | No test coverage     |

### Gaps Identified

- AC-003: Missing error handling tests
- NFR-002: Performance not validated

### Sign-off

Validation Confidence: [C: 0.85]
Recommendation: Address FAIL items before release
```

## IDR Integration

Append validation section to IDR:

**Reference**: [@../../orchestrating-workflows/references/shared/idr-generation.md](../../orchestrating-workflows/references/shared/idr-generation.md)

## Pass/Fail Criteria

| Score  | Status | Action                 |
| ------ | ------ | ---------------------- |
| 100%   | PASS   | Ready to ship          |
| 90-99% | WARN   | Review gaps            |
| <90%   | FAIL   | Address before release |

## Related

- SOW generation: [@./sow-generation.md](./sow-generation.md)
- IDR generation: [@../../orchestrating-workflows/references/shared/idr-generation.md](../../orchestrating-workflows/references/shared/idr-generation.md)
