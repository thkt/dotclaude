# Test Scenarios

Input scenarios for command testing.

## Purpose

Define reproducible test cases for validating command behavior:

- Input definitions
- Expected behavior descriptions
- Edge case coverage

## Directory Structure

```text
scenarios/
├── README.md               # This file
├── fix-simple-bug.md       # Simple bug fix scenario
├── code-new-feature.md     # New feature implementation
├── think-complex.md        # Complex planning scenario
└── review-security.md      # Security-focused review
```

## Scenario Template

```markdown
# Scenario: [Name]

## Input
- Command: /[command]
- Arguments: [args]
- Context: [file changes, git status, etc.]

## Expected Behavior
1. [Step 1]
2. [Step 2]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Edge Cases
- Case A: [description]
- Case B: [description]
```

## Status

This directory is part of the Golden Master testing strategy.
See: [tests/README.md](../README.md)
