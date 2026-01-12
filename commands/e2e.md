---
description: Generate documentation and Playwright tests through guided browser operations
allowed-tools: Read, Write, Glob, Task, mcp__claude-in-chrome__*, mcp__playwright__*
model: opus
argument-hint: "[test-name]"
dependencies: [automating-browser, managing-testing]
---

# /e2e - E2E Test Generation

Generate documentation and Playwright tests through browser operations.

## Input

- Argument: test name (required)
- If missing: prompt via AskUserQuestion

## Execution

Browser operations via `claude-in-chrome`, then generate Playwright tests (workflow defined in managing-testing).

## Output

```text
tests/e2e/[test-name]/
├── README.md          # Documentation
├── screenshots/       # Step images
└── [name].spec.ts     # Playwright test
```
