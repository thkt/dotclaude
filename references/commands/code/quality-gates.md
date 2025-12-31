# Quality Gates & Checks

This module handles quality verification during implementation.

## Dynamic Quality Checks

### Automatic Discovery

```bash
!`cat package.json 2>/dev/null || echo "(no package.json found)"`
```

### Parallel Execution

Run quality checks simultaneously:

```typescript
// Execute these in parallel, not sequentially
const qualityChecks = [
  Bash({ command: "npm run lint" }),
  Bash({ command: "npm run type-check" }),
  Bash({ command: "npm test -- --findRelatedTests" }),
  Bash({ command: "npm run format:check" })
];
```

## Quality Check Results

### Linting (Confidence: 0.95)

```bash
npm run lint | tail -5
```

- Status: PASS
- Issues: 0 errors, 2 warnings
- Time: 1.2s

### Type Checking (Confidence: 0.98)

```bash
npm run type-check | tail -5
```

- Status: PASS - All types valid
- Files checked: 47
- Time: 3.4s

### Tests (Confidence: 0.92)

```bash
npm test -- --passWithNoTests | grep -E "Tests:|Snapshots:"
```

- Status: PASS - 45/45 passing
- Coverage: 82%
- Time: 8.7s

### Format Check (Confidence: 0.90)

```bash
npm run format:check | tail -3
```

- Status: WARN - 3 files need formatting
- Auto-fixable: Yes
- Time: 0.8s

## Quality Score Calculation

```text
Overall Quality Score: (L*0.3 + T*0.3 + Test*0.3 + F*0.1) = 0.93
Confidence Level: HIGH - Ready for commit
```

## Quality Check Progress Display

```markdown
Quality checks in progress:
├─ Tests      [████████████] PASS 45/45 passing
├─ Coverage   [████████░░░░] WARN 78% (Target: 80%)
├─ Lint       [████████████] PASS 0 errors, 2 warnings
├─ TypeCheck  [████████████] PASS All types valid
└─ Format     [████████████] PASS Formatted

Quality Score: 92% | Confidence: HIGH
```

## Risk Mitigation

### Common Implementation Risks

| Risk | Probability | Impact | Mitigation | Confidence |
| --- | --- | --- | --- | --- |
| Breaking existing tests | Medium | High | Run full suite before/after | 0.95 |
| Performance regression | Low | High | Profile critical paths | 0.88 |
| Security vulnerability | Low | Critical | Security scan + review | 0.92 |
| Inconsistent patterns | Medium | Medium | Follow existing examples | 0.90 |
| Missing edge cases | High | Medium | Comprehensive test cases | 0.85 |

## Advanced Quality Features

### Real-time Test Monitoring

```bash
npm test -- --watch --coverage
```

### Code Complexity Analysis

```bash
npx complexity-report src/ | grep -E "Complexity|Maintainability"
```

### Performance Profiling

```bash
npm run profile
```

### Security Scanning

```bash
npm audit --production | grep -E "found|Severity"
```

## Quality Gate Failures

```markdown
## Quality Gate Failed
### Issue: Coverage dropped below 80%

Current: 78% (-2% from main)
Uncovered lines: src/auth/validator.ts:45-52

Actions:
1. [TODO] Add tests for uncovered lines
2. [PENDING] Or document why not testable
3. [PENDING] Or adjust threshold (not recommended)

Proceeding without resolution? (y/N)
```
