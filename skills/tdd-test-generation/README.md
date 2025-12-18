# TDD Test Generation Skill

Test generation skill based on TDD/RGRC cycle and Baby Steps methodology.

## Overview

Build tests and code incrementally following the Red-Green-Refactor-Commit cycle.

This is a **knowledge-base skill** - Claude directly writes tests and runs test commands via the Bash tool, providing more context-aware test generation than standalone scripts.

## Usage

Used automatically by `/code` command when writing tests.

```bash
/code "implement user validation"
```

Claude will follow the RGRC cycle:

1. **Red** - Write a failing test
2. **Green** - Write minimum code to pass
3. **Refactor** - Improve code quality
4. **Commit** - Commit changes

## Structure

```text
tdd-test-generation/
├── SKILL.md           # Main skill definition (RGRC workflow)
├── README.md          # This file
├── assets/            # Config templates (reference only)
│   ├── vitest.config.ts   # Vitest config template
│   └── jest.config.js     # Jest config template
└── references/        # Guides
    ├── tdd-rgrc.md        # RGRC cycle methodology
    └── test-design.md     # Test design techniques
```

## Test Framework Detection

Claude auto-detects the test framework from package.json:

- **Vitest**: If `vitest` is in dependencies
- **Jest**: If `jest` is in dependencies
- **Default**: Vitest (if no framework found)

## AAA Pattern

Tests follow the AAA (Arrange-Act-Assert) pattern:

```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }]

  // Act
  const result = calculateTotal(items)

  // Assert
  expect(result).toBe(300)
})
```

## Related Commands

- `/code` - TDD implementation (references this skill)
- `/test` - Run and verify tests

## Details

See `SKILL.md` for complete documentation.
