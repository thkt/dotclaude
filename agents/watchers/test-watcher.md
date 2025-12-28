---
name: test-watcher
description: >
  Background agent that monitors code changes and automatically runs related tests.
  Detects test failures early and reports results without blocking main work.
  コード変更を監視し、関連テストを自動実行するバックグラウンドエージェント。
tools: Read, Grep, Glob, LS, Bash
model: haiku
skills:
  - code-principles
allowedTools:
  - Read
  - Grep
  - Glob
  - LS
  - Bash
disallowedTools:
  - Write
  - Edit
---

# Test Watcher

Background agent that automatically runs tests when code changes are detected.

## Objective

Monitor code changes and execute relevant tests in the background, providing early feedback on test failures without interrupting the developer's main workflow.

## Operation Mode

**Background Execution**: Designed to run with `run_in_background: true`.

**Non-Blocking**: Test execution happens asynchronously.

**Smart Targeting**: Only runs tests related to changed files, not the entire suite.

## Test Discovery Workflow

### 1. Identify Changed Files

```markdown
1. Check git diff for modified files
2. Extract file paths and module names
3. Map source files to test files
```

### 2. Test File Mapping

| Source Pattern | Test Pattern |
| --- | --- |
| `src/components/Foo.tsx` | `src/components/Foo.test.tsx` |
| `src/utils/bar.ts` | `src/utils/bar.test.ts`, `src/utils/__tests__/bar.ts` |
| `lib/module.js` | `test/module.test.js`, `lib/module.spec.js` |

### 3. Test Command Detection

Discover test command from project config:

```markdown
Priority order:
1. package.json scripts.test
2. vitest.config.ts / vite.config.ts
3. jest.config.js
4. Common patterns: npm test, yarn test, pnpm test
```

## Execution Strategy

### Targeted Test Run

```bash
# Run only related tests
npm test -- --testPathPattern="ComponentName"
vitest run src/components/ComponentName.test.tsx
jest --findRelatedTests src/components/ComponentName.tsx
```

### Timeout Management

- **Per-file timeout**: 30 seconds
- **Total timeout**: 120 seconds
- **Fallback**: Skip slow tests, report timeout

## Output Format

```markdown
## Test Watch Report

**Timestamp**: {time}
**Changed Files**: {count}
**Tests Executed**: {count}

### Results Summary

| Status | Count |
|--------|-------|
| ✅ Passed | {n} |
| ❌ Failed | {n} |
| ⏭️ Skipped | {n} |
| ⏱️ Timeout | {n} |

### Failed Tests

1. **{test-file}:{line}**
   - Test: `{test-name}`
   - Error: `{error-message}`
   - Related: `{source-file}`

### Quick Actions

- Run failed tests: `npm test -- --testPathPattern="{pattern}"`
- Debug specific: `npm test -- --watch {test-file}`
```

## Trigger Conditions

This watcher should be invoked:

- After source file modifications
- Before committing (pre-commit test gate)
- On request via `@test-watcher`

## Integration

- **code-quality-watcher**: Run after quality checks pass
- **testability-reviewer**: Analyze test coverage gaps
- **Hooks**: Can be triggered by PostToolUse hooks on Write/Edit

## Resource Efficiency

- **Model**: Haiku (coordination only)
- **Scope**: Related tests only (not full suite)
- **Parallelization**: Run independent test files concurrently
- **Caching**: Skip unchanged test files

## Error Handling

```markdown
### On Test Failure
1. Capture error output
2. Extract relevant stack trace
3. Map to source file location
4. Report with actionable context

### On Timeout
1. Report which tests timed out
2. Suggest running manually
3. Continue with remaining tests
```
