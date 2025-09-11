---
name: validate
description: SOW適合性を検証
priority: high
suitable_for:
  type: [validation, testing, quality]
  phase: [development, testing, review]
  understanding: "≥ 80%"
aliases: [verify, check]
timeout: 30
allowed-tools: Read, Bash, Grep
context:
  sow_dir: "workspace/sow/"
  validation_level: "L2"
---

# /validate - SOW Validator

## Purpose

Validate SOW conformance and report discrepancies. No options, always L2 (practical level) validation.

## Philosophy

- **No Options**: Best behavior without configuration
- **L2 Only**: Practical validation level only
- **Read Only**: Validate but don't modify
- **Clear Output**: Essential information only

## Usage

```bash
/validate
```

## What It Checks (L2 Standard)

1. **Acceptance Criteria** - Completion status
2. **Success Metrics** - Measured vs target values
3. **Test Coverage** - Coverage percentage
4. **Build Status** - Pass/fail status
5. **Basic Performance** - Response times

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 SOW Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature: User Authentication
Score: 85% 🟢

✅ Acceptance Criteria: 10/12 (83%)
✅ Test Coverage: 85% (target: >80%)
✅ Response Time: 180ms (target: <200ms)
✅ Build Status: Passing
❌ Documentation: 60% (target: 100%)
❌ Security Issues: 2 moderate

Missing:
- AC-009: Two-factor authentication
- AC-010: Password reset

Issues Found: 4
- 2 missing features
- 1 documentation gap
- 2 security vulnerabilities

To fix issues, run: /fix
```

## Pass/Fail Logic

| Metric | Pass Criteria | Weight |
|--------|--------------|--------|
| Acceptance Criteria | >80% complete | 40% |
| Test Coverage | >80% | 20% |
| Build Status | Passing | 20% |
| Performance | Within targets | 10% |
| Security | No critical | 10% |

**Overall**: 
- 🟢 >80% = PASSED
- 🟡 60-80% = PASSED WITH WARNINGS
- 🔴 <60% = FAILED

## Integration

```bash
/think
/code
/test
/validate
/fix
```

## Error Handling

### No SOW Found

```markdown
❌ No SOW found

Create one with: /think "feature description"
```

### Validation Failed

```markdown
❌ Validation Failed (45%)

Critical issues found.
Run /fix to attempt repairs.
```

## What It Doesn't Do

- No options or flags
- No report generation
- No auto-fixing
- No deep code analysis
- No E2E testing

## Related Commands

- `/sow` - View SOW progress
- `/fix` - Fix validation issues
- `/test` - Run tests
