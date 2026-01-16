# Rollback Plan Guide

## Rollback Triggers

| Trigger          | Threshold        | Action             |
| ---------------- | ---------------- | ------------------ |
| Error rate       | >X% increase     | Immediate rollback |
| Response time    | >Xms degradation | Gradual rollback   |
| Critical failure | Any              | Immediate rollback |

## Rollback Strategies

| Strategy     | When to Use                       | Time    |
| ------------ | --------------------------------- | ------- |
| Immediate    | Critical failure, data corruption | <5 min  |
| Gradual      | Performance issues, minor bugs    | <10 min |
| Roll Forward | Fix faster than rollback          | Varies  |

## Immediate Rollback Steps

| Step | Action                                  | Verification            |
| ---- | --------------------------------------- | ----------------------- |
| 1    | Detect issue (monitoring/logs)          | Confirm trigger met     |
| 2    | Approve rollback                        | Decision maker sign-off |
| 3    | Execute `git revert` or deploy prev tag | Deployment success      |
| 4    | Verify functionality                    | Error rate normalized   |

## Gradual Rollback Steps

| Phase | Action                        | Time    |
| ----- | ----------------------------- | ------- |
| 1     | Disable feature flag          | <2 min  |
| 2     | Switch traffic to old version | <5 min  |
| 3     | Full rollback if needed       | <10 min |

## Data Considerations

| Scenario            | Action                        |
| ------------------- | ----------------------------- |
| DB migration exists | Prepare rollback script       |
| Data format changed | Verify backward compatibility |
| New data created    | Define handling strategy      |

## Verification Checklist

| Check              | Target        |
| ------------------ | ------------- |
| Main functionality | Working       |
| Error rate         | ≤ baseline    |
| Response time      | ≤ baseline    |
| Error logs         | No new errors |

## Decision Matrix

| Condition                | Recommendation     |
| ------------------------ | ------------------ |
| Fix time < rollback time | Roll Forward       |
| Data loss risk           | Roll Forward       |
| Critical path affected   | Immediate Rollback |
| Performance only         | Gradual Rollback   |
