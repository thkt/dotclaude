# Test Coverage Guide

## Test Types

| Type        | Purpose               | Coverage Target |
| ----------- | --------------------- | --------------- |
| Unit        | Function/method level | ≥80%            |
| Integration | Module interaction    | Key paths       |
| E2E         | User flows            | Critical paths  |
| Performance | Load/stress           | Benchmarks      |

## Impact Assessment

| Check            | Questions                         |
| ---------------- | --------------------------------- |
| Affected tests   | How many test files need updates? |
| Breaking changes | Will existing tests fail?         |
| Mock updates     | Which mocks need changes?         |
| Test data        | Fixtures need updates?            |

## New Test Requirements

| Priority | Test Type   | Focus                         |
| -------- | ----------- | ----------------------------- |
| P0       | Unit        | New functions, error handling |
| P1       | Integration | API contracts, DB operations  |
| P2       | E2E         | Critical user flows           |
| P3       | Performance | If perf-sensitive             |

## Coverage Targets

| Metric    | Minimum | Recommended |
| --------- | ------- | ----------- |
| Statement | 70%     | 80%         |
| Branch    | 60%     | 70%         |
| Function  | 80%     | 90%         |

## Test Checklist by Type

### Unit Tests

| Check          | Description        |
| -------------- | ------------------ |
| Happy path     | Normal operation   |
| Edge cases     | Boundary values    |
| Error cases    | Exception handling |
| Null/undefined | Missing inputs     |

### Integration Tests

| Check             | Description        |
| ----------------- | ------------------ |
| Module boundaries | Cross-module calls |
| API contracts     | Request/response   |
| DB operations     | CRUD operations    |
| External services | Mock/stub behavior |

### E2E Tests

| Check           | Description           |
| --------------- | --------------------- |
| Critical paths  | Login, checkout, etc. |
| Error scenarios | Form validation, 404  |
| Cross-browser   | If applicable         |

## Quality Gates

| Gate       | Criteria               |
| ---------- | ---------------------- |
| PR merge   | Unit tests pass        |
| Staging    | Integration tests pass |
| Production | All tests + E2E pass   |
