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
    ralph-wiggum,
  ]
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

- [@../skills/generating-tdd-tests/SKILL.md] - TDD/RGRC cycle, Baby Steps

## Conditional Context (Flag-based)

Load with flags when needed:

| Flag           | Context                                          | When to Use                   |
| -------------- | ------------------------------------------------ | ----------------------------- |
| `--frontend`   | [@../skills/applying-frontend-patterns/SKILL.md] | React/UI components           |
| `--principles` | [@../skills/applying-code-principles/SKILL.md]   | Design decisions, refactoring |
| `--storybook`  | [@../skills/integrating-storybook/SKILL.md]      | Component Stories             |

## Project Context (Auto-detected)

```bash
!`git status --porcelain 2>/dev/null | head -5 || echo "(no git)"`
!`ls package.json 2>/dev/null && echo "package.json found" || echo "(no package.json)"`
```

## Specification Context

For spec.md detection: [@../references/commands/code/spec-context.md](../references/commands/code/spec-context.md)

## Implementation Cycle

### TDD/RGRC (Primary)

1. **Red**: Write failing test
2. **Green**: Minimal code to pass (auto-iterated via ralph-wiggum)
3. **Refactor**: Apply principles (Quick Decision Questions)
4. **Commit**: Save stable state

### Phase 0: Test Preparation

For spec-driven test generation: [@../references/commands/code/test-preparation.md](../references/commands/code/test-preparation.md)

### RGRC Cycle Details

For detailed cycle: [@../references/commands/code/rgrc-cycle.md](../references/commands/code/rgrc-cycle.md)

## Quality Gates

For quality checks and verification: [@../references/commands/code/quality-gates.md](../references/commands/code/quality-gates.md)

## Completion Criteria

For definition of done: [@../references/commands/code/completion.md](../references/commands/code/completion.md)

## Quick Decision Questions (Always Apply)

Before writing code, ask:

1. **Simplest solution?** - Is there a simpler way?
2. **Already exists?** - Am I duplicating knowledge?
3. **One responsibility?** - Single reason to change?
4. **Understandable?** - Can someone understand in <1 minute?
5. **Needed now?** - Is this solving a real problem?

## IDR Generation

After implementation is complete, generate an IDR (Implementation Decision Record) to document implementation decisions.

### IDR Requirement Check

Before generating IDR, check if it's required:

1. **Check spec.md** for `idr_required` field (Section 11)
2. **If spec exists and `idr_required: false`** → Skip IDR generation
3. **If spec exists and `idr_required: true`** → Generate IDR
4. **If no spec exists** → Apply default logic (generate if SOW exists)

```text
Spec check: ~/.claude/workspace/planning/**/spec.md → Section 11
```

### IDR Detection & Generation

For detailed logic: [@../references/commands/shared/idr-generation.md](../references/commands/shared/idr-generation.md)

1. **Search for SOW**:

   ```text
   Glob pattern: ~/.claude/workspace/planning/**/sow.md
   ```

2. **If SOW found**:
   - IDR path: `[SOW directory]/idr.md`
   - Create or update IDR

3. **If SOW not found (standalone mode)**:
   - IDR path: `~/.claude/workspace/idr/[feature-name]/idr.md`
   - Create standalone IDR

### IDR Content Generation

Generate `/code` section with:

- **Changed Files**: From git diff or tool results
- **Implementation Decisions**: Key choices made
- **Attention Points**: Gotchas, edge cases, review notes
- **Applied Principles**: TDD, Occam's Razor, SOLID, etc.
- **Confidence score**

### IDR Output Format

```markdown
## /code - [YYYY-MM-DD HH:MM]

### Changed Files

| File            | Change Type      | Description |
| --------------- | ---------------- | ----------- |
| path/to/file.ts | Created/Modified | [summary]   |

### Implementation Decisions

| Decision   | Rationale   | Alternatives Considered |
| ---------- | ----------- | ----------------------- |
| [decision] | [rationale] | [alternatives]          |

### Attention Points

- [attention points]

### Applied Principles

- [applied principles]

### Confidence: [C: 0.XX]
```

### SOW Update

If SOW exists, update its Implementation Records section with IDR link and status.

## Next Steps

- **All tests pass** → Ready for `/test` or `/audit`
- **Quality issues** → Fix before proceeding
- **Unclear requirements** → Use `/research` first
