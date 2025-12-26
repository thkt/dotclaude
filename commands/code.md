---
description: Implement code following TDD/RGRC cycle with real-time test feedback
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: inherit
argument-hint: "[implementation description] [--frontend] [--principles] [--storybook]"
dependencies: [generating-tdd-tests, applying-frontend-patterns, applying-code-principles, integrating-storybook]
---

# /code - TDD Implementation

## Purpose

Implement code with TDD/RGRC cycle and quality checks.

## Usage

```bash
/code "implement user validation"           # Default mode
/code --frontend "implement LoginForm"      # + Frontend patterns
/code --principles "refactor auth module"   # + Full principles
/code --storybook "implement Button"        # + Storybook integration
```

## Essential Context (Always Loaded)

- [@~/.claude/skills/generating-tdd-tests/SKILL.md] - TDD/RGRC cycle, Baby Steps
- [@~/.claude/rules/core/ESSENTIAL_PRINCIPLES.md] - Quick Decision Questions

## Conditional Context (Flag-based)

Load with flags when needed:

| Flag | Context | When to Use |
| --- | --- | --- |
| `--frontend` | [@~/.claude/skills/applying-frontend-patterns/SKILL.md] | React/UI components |
| `--principles` | [@~/.claude/skills/applying-code-principles/SKILL.md] | Design decisions, refactoring |
| `--storybook` | [@~/.claude/skills/integrating-storybook/SKILL.md] | Component Stories |

## Project Context (Auto-detected)

```bash
!`git status --porcelain 2>/dev/null | head -5 || echo "(no git)"`
!`ls package.json 2>/dev/null && echo "package.json found" || echo "(no package.json)"`
```

## Specification Context

For spec.md detection: [@./code/spec-context.md](./code/spec-context.md)

## Implementation Cycle

### TDD/RGRC (Primary)

1. **Red**: Write failing test
2. **Green**: Minimal code to pass
3. **Refactor**: Apply principles (Quick Decision Questions)
4. **Commit**: Save stable state

### Phase 0: Test Preparation

For spec-driven test generation: [@./code/test-preparation.md](./code/test-preparation.md)

### RGRC Cycle Details

For detailed cycle: [@./code/rgrc-cycle.md](./code/rgrc-cycle.md)

## Quality Gates

For quality checks and verification: [@./code/quality-gates.md](./code/quality-gates.md)

## Completion Criteria

For definition of done: [@./code/completion.md](./code/completion.md)

## Quick Decision Questions (Always Apply)

Before writing code, ask:

1. **Simplest solution?** - Is there a simpler way?
2. **Already exists?** - Am I duplicating knowledge?
3. **One responsibility?** - Single reason to change?
4. **Understandable?** - Can someone understand in <1 minute?
5. **Needed now?** - Is this solving a real problem?

## Next Steps

- **All tests pass** → Ready for `/test` or `/audit`
- **Quality issues** → Fix before proceeding
- **Unclear requirements** → Use `/research` first
