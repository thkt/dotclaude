# Rollback Plan Checklist

ADR: [Number/Title]
Created: [YYYY-MM-DD]

## Rollback Triggers

Execute rollback under the following conditions:

- [ ] Trigger 1: ___
- [ ] Trigger 2: ___
- [ ] Trigger 3: ___

### Details

**Unacceptable Error Rate**: ___%

**Performance Degradation Threshold**: ___

**Other Critical Metrics**:

-
-

## Rollback Procedures

### Immediate Rollback (Within 5 minutes)

#### Step 1: Detection

- [ ] Check monitoring alerts
- [ ] Review error logs
- [ ] Assess user impact

#### Step 2: Decision

- [ ] Verify rollback execution criteria
- [ ] Report to responsible person
- [ ] Approve rollback initiation

#### Step 3: Execution

```bash
# Rollback command example
git revert {{COMMIT_HASH}}
# or
git checkout {{PREVIOUS_TAG}}

# Deploy
{{DEPLOY_COMMAND}}
```

#### Step 4: Verification

- [ ] Confirm deployment success
- [ ] Verify functionality
- [ ] Confirm error rate normalization

### Details

**Estimated Time**: ___ minutes

**Required Permissions**:

- [ ] Deployment permissions
- [ ] Database access permissions
- [ ] Other: ___

## Gradual Rollback

Before a complete rollback, gradual rollback can be attempted.

### Phase 1: Partial Disable (Within 2 minutes)

- [ ] Disable via feature flag
- [ ] Limit to specific user groups
- [ ] Stop canary release

**Command**:

```bash
# Feature flag disable example
{{FEATURE_FLAG_DISABLE_COMMAND}}
```

### Phase 2: Traffic Switchback (Within 5 minutes)

- [ ] Modify load balancer configuration
- [ ] Clear CDN cache
- [ ] Route to previous version

**Command**:

```bash
# Traffic switchback example
{{TRAFFIC_ROLLBACK_COMMAND}}
```

### Phase 3: Complete Rollback (Within 10 minutes)

- [ ] Restore previous version in all environments
- [ ] Rollback database migrations
- [ ] Restore configuration files

## Data Integrity

### If Database Changes Exist

- [ ] Prepare migration rollback script
- [ ] Verify data backup
- [ ] Data verification method after rollback

**Rollback Script**:

```bash
# Database migration rollback example
{{DB_ROLLBACK_COMMAND}}
```

### Data Integrity Check

- [ ] Data snapshot before rollback
- [ ] Integrity verification after rollback
- [ ] Procedure for fixing inconsistent data

**Validation Query**:

```sql
-- Data integrity check query example
{{VALIDATION_QUERY}}
```

## Dependency Handling

### Impact on External Services

- [ ] Verify API compatibility
- [ ] Notify external services
- [ ] Re-run integration tests

**Affected External Services**:

- Service 1: ___
- Service 2: ___

### Internal Dependencies

- [ ] Handle dependent microservices
- [ ] Manage shared library versions
- [ ] Clear caches

## Notification and Communication

### Stakeholder Notification

- [ ] Notify users (if necessary)
- [ ] Report to team
- [ ] Report to management (if critical)

**Notification Template**:

```text
Subject: [Important] System Rollback Notice

Body: ___
```

### Incident Recording

- [ ] Record rollback reason
- [ ] Record timeline
- [ ] Record impact scope
- [ ] Consider preventive measures

## Backup

### Code Backup

- [ ] Create Git tag: {{TAG_NAME}}
- [ ] Protect branch: {{BRANCH_NAME}}
- [ ] Save release artifacts

### Data Backup

- [ ] Verify database backup (Date/Time: ___)
- [ ] File system backup (if necessary)
- [ ] Configuration file backup

**Backup Locations**:

- Code: ___
- Database: ___
- Configuration: ___

## Verification Items

### Post-Rollback Verification

- [ ] Verify main functionality
- [ ] Check error logs
- [ ] Verify performance metrics
- [ ] Verify user impact

**Check Items**:

1. [ ] Feature A: ___
2. [ ] Feature B: ___
3. [ ] Feature C: ___

### Monitoring

- [ ] Error rate: ___% or less
- [ ] Response time: ___ms or less
- [ ] CPU usage: ___% or less
- [ ] Memory usage: ___% or less

## Roll Forward

Procedure for fixing by moving forward instead of rollback:

### Emergency Patch

- [ ] Identify fix content
- [ ] Create hotfix branch
- [ ] Implement minimal fix
- [ ] Test and deploy

**Estimated Time**: ___ minutes

**Decision Criteria**:

- Faster than rollback: [ ] Roll Forward
- Risk of data loss: [ ] Roll Forward
- Other: ___

## Test Rollback

Test rollback procedure before production deployment.

### Staging Environment Verification

- [ ] Rollback test execution date in staging: ___
- [ ] Measured rollback time: ___ minutes
- [ ] Procedure document validation
- [ ] Identify unexpected issues

**Test Results**:

**Improvements**:

## Responsible Persons

- **Rollback Decision Maker**: ___
- **Rollback Executor**: ___
- **Verification Person**: ___
- **Communication Person**: ___

## Contact Information

- **Emergency Contact**: ___
- **Escalation Contact**: ___
- **External Vendor (if applicable)**: ___

## Summary

**Rollback Risk Assessment**: [ ] Low / [ ] Medium / [ ] High

**Rollback Estimated Time**: ___ minutes

**Data Loss Risk**: [ ] None / [ ] Low / [ ] Medium / [ ] High

**Recommended Approach**: [ ] Rollback / [ ] Roll Forward / [ ] Gradual

**Approver**:

**Approval Date**:

---

*Checklist completed: [YYYY-MM-DD]*
*Completed by: [Name]*
*Last test date: [YYYY-MM-DD]*
