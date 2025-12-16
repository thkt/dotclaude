---
description: >
  Implement code following TDD/RGRC cycle (Red-Green-Refactor-Commit) with real-time test feedback and quality checks.
  Use for feature implementation, refactoring, or bug fixes when you have clear understanding (≥70%) of requirements.
  Applies SOLID principles, DRY, and progressive enhancement. Includes dynamic quality discovery and confidence scoring.
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: inherit
argument-hint: "[implementation description]"
---

# /code - Advanced Implementation with Dynamic Quality Assurance

## Purpose

Perform code implementation with real-time test feedback, dynamic quality discovery, and confidence-scored decisions.

## Usage Modes

- **Standalone**: Implement specific features or bug fixes
- **Workflow**: Code based on `/research` results, then proceed to `/test`

## Prerequisites (Workflow Mode)

- SOW created in `/think`
- Technical research completed in `/research`
- For standalone use, implementation details must be clear

## Dynamic Project Context

**Note**: These checks are optional. Skip if files/commands are not available.

### Current Git Status

```bash
!`git status --porcelain 2>/dev/null || echo "(not a git repository)"`
```

### Package.json Check

```bash
!`ls package.json 2>/dev/null || echo "(no package.json)"`
```

### NPM Scripts Available

```bash
!`npm run 2>/dev/null || yarn run 2>/dev/null || pnpm run 2>/dev/null || bun run 2>/dev/null || echo "(no package manager scripts)"`
```

### Config Files

```bash
!`ls *.json 2>/dev/null || echo "(no json files)"`
```

### Recent Commits

```bash
!`git log --oneline -5 2>/dev/null || echo "(no git history)"`
```

## Specification Context (Auto-Detection)

For spec.md detection and loading details, see:
[@./code/spec-context.md](./code/spec-context.md)

## Storybook Integration (Optional)

For automatic Stories generation from spec.md, see:
[@./code/storybook.md](./code/storybook.md)

## Integration with Skills

This command references the following Skills for implementation guidance:

- [@~/.claude/skills/tdd-test-generation/SKILL.md] - TDD/RGRC cycle, Baby Steps, systematic test design
- [@~/.claude/skills/frontend-patterns/SKILL.md] - Frontend component design patterns (Container/Presentational, Hooks, State Management, Composition)
- [@~/.claude/skills/code-principles/SKILL.md] - Fundamental software development principles (SOLID, DRY, Occam's Razor, Miller's Law, YAGNI)
- [@~/.claude/skills/storybook-integration/SKILL.md] - Component API to Stories generation (CSF3, autodocs)

## Implementation Principles

### Applied Development Rules

- [@~/.claude/skills/tdd-test-generation/SKILL.md] - Test-Driven Development with Baby Steps (primary)
- [@~/.claude/skills/code-principles/SKILL.md] - Fundamental software principles (SOLID, DRY, Occam's Razor, YAGNI)
- [@~/.claude/skills/frontend-patterns/SKILL.md] - Frontend component design patterns
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - CSS-first approach for UI
- [@~/.claude/rules/development/READABLE_CODE.md](~/.claude/rules/development/READABLE_CODE.md) - Code readability and clarity

### Principle Hierarchy

**TDD/RGRC is the primary implementation cycle**. With test-generator enhancement:

- **Phase 0 (Preparation)**: test-generator creates test scaffold from spec.md
- **Red & Green phases**: Focus on functionality only
- **Refactor phase**: Apply SOLID and DRY principles
- **Commit phase**: Save stable state

This ensures:

1. Tests align with specification (Phase 0)
2. Code first works (TDD Red-Green)
3. Code becomes clean and maintainable (Refactor with SOLID/DRY)

### 0. Test Preparation (Phase 0 - Interactive Test Activation)

For spec-driven test generation with Baby Steps activation, see:
[@./code/test-preparation.md](./code/test-preparation.md)

### 1. Test-Driven Development (TDD) as t_wada would

For detailed TDD/RGRC cycle implementation with Baby Steps, see:
[@./code/rgrc-cycle.md](./code/rgrc-cycle.md)

### 2. SOLID Principles During Implementation

Apply during Refactor phase:

- **SRP**: Each class/function has one reason to change
- **OCP**: Extend functionality without modifying existing code
- **LSP**: Derived classes must be substitutable for base classes
- **ISP**: Clients shouldn't depend on unused interfaces
- **DIP**: Depend on abstractions, not concrete implementations

### 3. DRY (Don't Repeat Yourself) Principle

**"Every piece of knowledge must have a single, unambiguous, authoritative representation"**

- Extract repeated logic into functions
- Create configuration objects for repeated values
- Use composition for repeated structure
- Avoid copy-paste programming

### 4. Consistency with Existing Code

- Follow coding conventions
- Utilize existing patterns and libraries
- Maintain naming convention consistency

## Hierarchical Implementation Process

### Phase 1: Context Discovery & Planning

Analyze with confidence scoring:

1. **Code Context**: Understand existing patterns (C: 0.0-1.0)
2. **Dependencies**: Verify required libraries available
3. **Conventions**: Detect and follow project standards
4. **Test Structure**: Identify test patterns to follow

### Phase 2: Parallel Quality Execution

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

### Phase 3: Confidence-Based Decisions

Make implementation choices based on evidence:

- **High Confidence (>0.8)**: Proceed with implementation
- **Medium (0.5-0.8)**: Add defensive checks
- **Low (<0.5)**: Research before implementing

### 5. Code Implementation with TDD

Follow the RGRC cycle defined above:

- **Red**: Write failing test first
- **Green**: Minimal code to pass
- **Refactor**: Apply SOLID and DRY principles
- **Commit**: Save stable state

### 6. Quality Gates & Verification

For quality checks, risk mitigation, and implementation patterns, see:
[@./code/quality-gates.md](./code/quality-gates.md)

## Definition of Done & Decision Framework

For completion criteria and decision support, see:
[@./code/completion.md](./code/completion.md)

## Usage Examples

### Basic Implementation

```bash
/code "Add user authentication"
# Standard TDD implementation
```

### With Confidence Threshold

```bash
/code --confidence 0.9 "Critical payment logic"
# Requires 90% confidence before proceeding
```

### Fast Mode (Skip Some Checks)

```bash
/code --fast "Simple UI update"
# Minimal quality checks for low-risk changes
```

### With Specific Pattern

```bash
/code --pattern repository "Database access layer"
# Use repository pattern for implementation
```

## Applied Development Principles

### TDD/RGRC

[@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - Red-Green-Refactor-Commit cycle

Application:

- **Baby Steps**: Smallest possible change
- **Red**: Write failing test first
- **Green**: Minimal code to pass test
- **Refactor**: Improve clarity
- **Commit**: Manual commit after each cycle

### Occam's Razor

[@~/.claude/rules/reference/OCCAMS_RAZOR.md](~/.claude/rules/reference/OCCAMS_RAZOR.md) - "Entities should not be multiplied without necessity"

Application:

- **Simplest Solution**: Minimal implementation that meets requirements
- **Avoid Unnecessary Complexity**: Don't abstract until proven
- **Question Every Abstraction**: Is it truly necessary?
- **Avoid Premature Optimization**: Only for measured needs

## Next Steps

- **High Confidence (>0.9)** → Ready for `/test` or review
- **Medium (0.7-0.9)** → Consider additional testing
- **Low (<0.7)** → Need `/research` or planning
- **Quality Issues** → Fix before proceeding
- **All Green** → Ready for PR/commit
