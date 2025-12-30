# Claude Code Command Test Strategy

## Overview

Quality verification infrastructure for command outputs using the Golden Master methodology.

## What is Golden Master Testing?

A methodology that compares actual outputs against expected output samples (Golden Masters) to verify structure, required sections, and format consistency.

### Benefits

- **Reproducibility**: Expected outputs are clearly defined
- **Regression Detection**: Detects quality degradation from changes
- **Documentation**: Expected behavior remains as samples

### Limitations

- Dynamic content (timestamps, file paths, etc.) is difficult to verify
- Structure/section-level verification is more practical than exact matching

## Directory Structure

```text
~/.claude/tests/
├── README.md                 # This file
├── golden-masters/           # Expected output samples
│   ├── fix-output.md         # Expected /fix output example
│   ├── think-sow.md          # Expected /think SOW output
│   └── think-spec.md         # Expected /think Spec output
└── scenarios/                # Test scenarios
    ├── fix-simple-bug.md     # Simple bug fix scenario
    └── code-new-feature.md   # New feature implementation scenario
```

## Verification Criteria

### 1. Structure Verification

- [ ] All required sections exist
- [ ] Section order is correct
- [ ] Nesting structure is appropriate

### 2. Format Verification

- [ ] Markdown syntax is correct
- [ ] Code blocks are properly closed
- [ ] Links are valid

### 3. Content Verification

- [ ] Confidence markers (✓/→/?) are used appropriately
- [ ] Specific values (file paths, line numbers) are included
- [ ] Recommended actions are clear

## Manual Verification Checklists

### /fix Output Verification

```markdown
□ Specification Context section exists (newly added)
□ Phase 0.5: Deep Root Cause Analysis exists
□ Root Cause is identified
□ Fix is implemented
□ Tests are executed
□ Confidence markers (✓/→/?) are appropriate
```

### /think Output Verification

```markdown
□ Both SOW and Spec are generated
□ Executive Summary is clear
□ Problem Analysis has confidence markers
□ Assumptions & Prerequisites section exists
□ Acceptance Criteria is clear
□ Implementation Plan is specific
□ Risks & Mitigations are documented
```

### /code Output Verification

```markdown
□ Specification Context is referenced
□ RGRC cycle is executed
□ Quality Check Results are displayed
□ Definition of Done is satisfied
```

## Future Automation Roadmap

### Phase 1: Structure Verification Automation

- JSON Schema-based section validation
- Required section existence checks
- Nesting structure validation

```typescript
// Future implementation concept
interface SectionValidator {
  requiredSections: string[];
  optionalSections: string[];
  validateStructure(content: string): ValidationResult;
}
```

### Phase 2: Format Verification Automation

- markdownlint for format checking
- Code block validation
- Link validation

### Phase 3: CI/CD Integration

- Command output verification in GitHub Actions
- Automated checks on Pull Requests
- Report generation

## Related Documents

- [SOW/Spec Templates](../workspace/planning/)
- [Command Reference](../docs/COMMANDS.md)
- [Documentation Rules](../rules/reference/DOCUMENTATION_RULES.md)
- [Test Generation Skill](../skills/generating-tdd-tests/SKILL.md) - Systematic test design principles

---

*Last updated: 2025-12-16*
