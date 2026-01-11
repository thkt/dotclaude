---
description: Implement code following TDD/RGRC cycle with real-time test feedback
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[implementation description] [--frontend] [--principles] [--storybook]"
dependencies:
  [
    generating-tdd-tests,
    applying-frontend-patterns,
    applying-code-principles,
    integrating-storybook,
    orchestrating-workflows,
    ralph-wiggum,
  ]
---

# /code - TDD Implementation

Implement code with TDD/RGRC cycle and quality checks.

## Workflow Reference

**Full workflow**: [@../skills/orchestrating-workflows/references/code-workflow.md](../skills/orchestrating-workflows/references/code-workflow.md)

## Usage

```bash
/code "implement user validation"           # Default mode
/code --frontend "implement LoginForm"      # + Frontend patterns
/code --principles "refactor auth module"   # + Full principles
/code --storybook "implement Button"        # + Storybook integration
```

## Conditional Context

| Flag           | Context                    | When        |
| -------------- | -------------------------- | ----------- |
| `--frontend`   | applying-frontend-patterns | React/UI    |
| `--principles` | applying-code-principles   | Refactoring |
| `--storybook`  | integrating-storybook      | Stories     |

## Quick Decision Questions

Before writing code:

1. **Simplest solution?** - Is there a simpler way?
2. **Already exists?** - Am I duplicating knowledge?
3. **One responsibility?** - Single reason to change?
4. **Understandable?** - Can someone understand in <1 minute?

## RGRC Cycle

```text
1. Red    - Write failing test
2. Green  - Minimal code to pass (ralph-wiggum auto-iteration)
3. Refactor - Apply principles
4. Commit - Save stable state
```

**Details**: [@../skills/orchestrating-workflows/references/shared/tdd-cycle.md](../skills/orchestrating-workflows/references/shared/tdd-cycle.md)

## IDR Generation

After implementation, generate IDR if SOW exists.

**IDR logic**: [@../skills/orchestrating-workflows/references/shared/idr-generation.md](../skills/orchestrating-workflows/references/shared/idr-generation.md)

## Next Steps

- **All tests pass** → `/test` or `/audit`
- **Quality issues** → Fix before proceeding
- **Unclear** → `/research` first
