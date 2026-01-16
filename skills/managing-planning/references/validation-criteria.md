# Validation Criteria

SOW acceptance criteria validation for `/validate` command.

## Flow

```text
/validate → Detect SOW/IDR → Read AC → Validate each → Generate report → Update IDR
```

## AC Validation

| Check       | Question                     |
| ----------- | ---------------------------- |
| Implemented | Does code implement this AC? |
| Tested      | Do tests validate this AC?   |
| Documented  | Is behavior documented?      |
| Reviewed    | Was it reviewed in /audit?   |

## Confidence Assessment

| Result    | Confidence | Action             |
| --------- | ---------- | ------------------ |
| All PASS  | ≥0.9       | Ready for release  |
| Some WARN | 0.7-0.9    | Review warnings    |
| Any FAIL  | <0.7       | Fix before release |

## Pass/Fail Criteria

| Score  | Status | Action                 |
| ------ | ------ | ---------------------- |
| 100%   | PASS   | Ready to ship          |
| 90-99% | WARN   | Review gaps            |
| <90%   | FAIL   | Address before release |

## Report Format

```markdown
| AC     | Status | Evidence             |
| ------ | ------ | -------------------- |
| AC-001 | PASS   | test:auth.test.ts:45 |
| AC-002 | WARN   | 95ms (target: 100ms) |
| AC-003 | FAIL   | No test coverage     |
```

## Related

- IDR generation: [@../../orchestrating-workflows/references/shared/idr-generation.md]
- SOW generation: [@./sow-generation.md]
