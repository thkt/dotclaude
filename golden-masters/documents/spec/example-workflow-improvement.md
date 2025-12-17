<!--
Golden Master: Spec - Workflow Improvement

Selection criteria:
- sow-spec-reviewer score: 95/100
- Clear FR-001 through FR-010 functional requirements definition
- Data model definition using TypeScript interfaces
- Test scenarios in Given-When-Then format
- Comprehensive Migration Guide

Features:
- 1:1 correspondence between SOW Acceptance Criteria and FRs
- Concrete Implementation Details
- Measurable NFRs

Source: ~/.claude/workspace/planning/2025-12-16-spec-driven-workflow-improvement/

Last Reviewed: 2025-12-17
Update Reason: Added maintenance metadata fields
Previous Version: N/A
-->

# Specification: Workflow Improvement Based on Spec-Driven Development Practices

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: 2025-12-16

---

## 1. Functional Requirements

### 1.1 Phase 1: Golden Master Introduction

[✓] FR-001: Create golden-masters/ directory structure

- Input: None
- Output: Directory structure
- Validation: Following structure exists

```text
~/.claude/golden-masters/
├── sow/
│   └── example-*.md      # Ideal SOW examples
├── spec/
│   └── example-*.md      # Ideal Spec examples
└── README.md             # Usage guide & quality criteria
```

[→] FR-002: Create quality criteria documentation

- Input: Existing excellent SOW/Spec
- Output: README.md (quality criteria)
- Validation: Includes the following items
  - Evaluation aspects (structure, clarity, actionability)
  - Scoring methodology
  - Comparison process

[→] FR-003: Accumulate ideal examples

- Input: Past SOW/Spec
- Output: 3+ ideal examples
- Validation: Each example has selection rationale comments

### 1.2 Phase 2: Context Minimization

[→] FR-004: Separate essential and reference principles

- Input: Current skill/rule references
- Output: Separated context design
- Validation: Following classification

```markdown
## Essential Principles (Always Load)
- TDD/RGRC (Implementation base cycle)
- Occam's Razor (Decision criteria)

## Reference Principles (Load when needed)
- SOLID (During design)
- DRY (During refactoring)
- Frontend Patterns (During UI implementation)
```

[→] FR-005: Reduce /code command context

- Input: Current /code.md (254 lines + 2,827 lines reference)
- Output: Reduced /code.md
- Validation: Reference context below 1,500 lines

### 1.3 Phase 3: Command Split

[→] FR-006: Create /sow command

- Input: Feature description
- Output: sow.md only
- Validation: Single artifact

[→] FR-007: Create /spec command

- Input: sow.md (or none)
- Output: spec.md only
- Validation: Single artifact

[→] FR-008: Make /think a thin orchestrator

- Input: Feature description
- Output: /sow → /spec chain execution
- Validation: Under 100 lines

### 1.4 Phase 4: Instruction Simplification

[→] FR-009: Template externalization

- Input: Current in-command templates
- Output: templates/ directory
- Validation: Following structure

```text
~/.claude/templates/
├── sow.md           # SOW template
├── spec.md          # Spec template
└── review-report.md # Review report template
```

[→] FR-010: Refactor large commands

- Input: Commands over 500 lines
- Output: Commands under 200 lines
- Validation: Only core instructions remain

---

## 2. Data Model

### 2.1 Directory Structure

```typescript
interface WorkflowStructure {
  // Golden masters
  goldenMasters: {
    sow: string[];      // ~/.claude/golden-masters/sow/*.md
    spec: string[];     // ~/.claude/golden-masters/spec/*.md
    readme: string;     // ~/.claude/golden-masters/README.md
  };

  // Templates
  templates: {
    sow: string;        // ~/.claude/templates/sow.md
    spec: string;       // ~/.claude/templates/spec.md
  };

  // Commands
  commands: {
    sow: string;        // ~/.claude/commands/sow.md (new)
    spec: string;       // ~/.claude/commands/spec.md (new)
    think: string;      // ~/.claude/commands/think.md (simplified)
  };
}
```

### 2.2 Context Classification

```typescript
interface ContextClassification {
  // Essential (always load)
  essential: {
    tddRgrc: string;      // TDD/RGRC cycle
    occamsRazor: string;  // Decision criteria
  };

  // Reference (per task type)
  reference: {
    design: string[];     // SOLID, DRY
    frontend: string[];   // Container/Presentational, Hooks
    testing: string[];    // Test patterns
  };
}
```

---

## 3. Implementation Details

### 3.1 Phase 1: Golden Masters

#### Directory Creation

```bash
mkdir -p ~/.claude/golden-masters/{sow,spec}
```

#### README.md Content

```markdown
# Golden Masters - Prompt Quality Standards

## Purpose
Accumulate ideal artifact examples for prompt tuning standards.

## Quality Criteria

### SOW Evaluation Aspects
1. **Structure**: Coverage of required sections (25 points)
2. **Clarity**: Proper use of ✓/→/? markers (25 points)
3. **Actionability**: Concrete Acceptance Criteria (25 points)
4. **Risk Assessment**: Realistic risks and mitigations (25 points)

### Spec Evaluation Aspects
1. **Implementability**: Directly convertible to code (25 points)
2. **Testability**: Clear test scenarios (25 points)
3. **SOW Alignment**: Consistency with SOW (25 points)
4. **Completeness**: Edge case coverage (25 points)

## Usage
1. Generate new SOW/Spec
2. Compare with examples in golden-masters
3. Analyze differences and adjust prompts
```

### 3.2 Phase 2: Context Minimization

#### Current Reference Structure

```text
/code.md (254 lines)
├── Skills (4 files, 1,320 lines)
│   ├── tdd-test-generation/SKILL.md: 258 lines [Essential]
│   ├── frontend-patterns/SKILL.md: 362 lines [Reference]
│   ├── code-principles/SKILL.md: 430 lines [Reference]
│   └── storybook-integration/SKILL.md: 270 lines [Reference]
├── Rules (4 files, 778 lines)
│   ├── PROGRESSIVE_ENHANCEMENT.md: 91 lines [Reference]
│   ├── READABLE_CODE.md: 217 lines [Reference]
│   ├── TDD_RGRC.md: 200 lines [Essential]
│   └── OCCAMS_RAZOR.md: 270 lines [Essential]
└── Submodules (6 files, 729 lines)
```

#### Improved Reference Structure

```text
/code.md (150 lines target)
├── Essential (always load, 728 lines)
│   ├── tdd-test-generation/SKILL.md: 258 lines
│   ├── TDD_RGRC.md: 200 lines
│   └── OCCAMS_RAZOR.md: 270 lines
├── Conditional (per task type)
│   ├── --frontend: frontend-patterns/SKILL.md
│   ├── --principles: code-principles/SKILL.md
│   └── --storybook: storybook-integration/SKILL.md
└── Submodules (reference when needed)
```

### 3.3 Phase 3: Command Split

#### /sow.md (New)

```markdown
---
description: Generate Statement of Work (SOW) only
allowed-tools: Read, Write, Glob, Grep, Task
argument-hint: "[feature description]"
---

# /sow - SOW Generator

## Purpose
Generate sow.md only (single artifact).

## Template
[@~/.claude/templates/sow.md]

## Output
.claude/workspace/planning/[timestamp]-[feature]/sow.md
```

#### /spec.md (New)

```markdown
---
description: Generate Specification from SOW
allowed-tools: Read, Write, Glob, Grep
argument-hint: "[sow path or feature]"
---

# /spec - Spec Generator

## Purpose
Generate spec.md from sow.md (single artifact).

## Input
- SOW file path, or
- Auto-detect latest SOW

## Template
[@~/.claude/templates/spec.md]

## Output
.claude/workspace/planning/[same-dir]/spec.md
```

#### /think.md (After Simplification)

```markdown
---
description: Orchestrate /sow and /spec generation
allowed-tools: SlashCommand, Read
argument-hint: "[feature description]"
---

# /think - Planning Orchestrator

## Purpose
Orchestrate SOW and Spec generation.

## Process
1. Execute /sow "[feature]"
2. Execute /spec
3. Invoke sow-spec-reviewer

## Usage
/think "Add user authentication"
→ Generates sow.md + spec.md + review
```

---

## 4. Test Scenarios

### 4.1 Unit Tests

```typescript
describe('Phase 1: Golden Masters', () => {
  it('[✓] creates golden-masters directory structure', () => {
    // Given: fresh environment
    // When: setup script runs
    // Then: directories exist at expected paths
  });

  it('[→] validates SOW against golden master', () => {
    // Given: generated SOW and golden master
    // When: comparison runs
    // Then: diff report shows deviations
  });
});

describe('Phase 2: Context Minimization', () => {
  it('[→] reduces /code context to <1500 lines', () => {
    // Given: updated /code.md
    // When: context size calculated
    // Then: total < 1500 lines
  });
});

describe('Phase 3: Command Split', () => {
  it('[→] /sow generates only sow.md', () => {
    // Given: feature description
    // When: /sow executed
    // Then: only sow.md created, no spec.md
  });

  it('[→] /spec generates only spec.md', () => {
    // Given: existing sow.md
    // When: /spec executed
    // Then: only spec.md created
  });
});
```

### 4.2 Integration Tests

```typescript
describe('Workflow Integration', () => {
  it('[→] /think orchestrates /sow and /spec', () => {
    // Given: feature description
    // When: /think executed
    // Then: both sow.md and spec.md created via delegation
  });

  it('[→] context file auto-loaded in /sow', () => {
    // Given: research context file exists
    // When: /sow executed
    // Then: SOW includes research findings
  });
});
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

[→] NFR-001: Response time improvement through context reduction

- Target: Measurable improvement (baseline comparison)

### 5.2 Maintainability

[→] NFR-002: Each command under 200 lines

- Target: Readability allowing anyone to modify and improve

[→] NFR-003: Template externalization

- Target: Separation of commands and templates

### 5.3 Compatibility

[✓] NFR-004: Compatibility with existing workflow

- /think continues to work (internally calls /sow + /spec)
- Artifact paths unchanged

---

## 6. Dependencies

### 6.1 External Libraries

[✓] None - Pure Markdown file operations

### 6.2 Internal Services

[✓] SlashCommand: Command chain execution
[✓] Task: sow-spec-reviewer invocation
[✓] Write: File generation

---

## 7. Known Issues & Assumptions

### Assumptions (→)

1. [→] Context reduction improves LLM output quality
2. [→] Command splitting improves maintainability
3. [→] Golden master comparison enables quality quantification

### Unknown / Need Verification (?)

1. [?] Optimal context size threshold
2. [?] Performance impact of template externalization
3. [?] User learning cost

---

## 8. Implementation Checklist

### Phase 1: Golden Masters (Day 1)

- [ ] Create golden-masters/ directory
- [ ] Create README.md (quality criteria)
- [ ] Select and copy 3 examples from existing SOW/Spec

### Phase 2: Context Minimization (Day 2)

- [ ] Create essential/reference principles classification document
- [ ] Update /code.md reference structure
- [ ] Re-measure context size

### Phase 3: Command Split (Day 3-4)

- [ ] Create new /sow.md
- [ ] Create new /spec.md
- [ ] Simplify /think.md
- [ ] Create templates/ directory
- [ ] Externalize sow.md template
- [ ] Externalize spec.md template

### Phase 4: Instruction Simplification (Day 5+)

- [ ] Split /fix.md into modules
- [ ] Simplify /research.md
- [ ] Simplify /rulify.md
- [ ] Confirm each command under 200 lines

---

## 9. Migration Guide

### For Existing Users

```markdown
## Changes

### /think Command
- **Before**: Directly generates sow.md + spec.md
- **After**: Internally calls /sow + /spec
- **Compatibility**: No change in usage

### New Commands
- `/sow`: When you want to generate SOW only
- `/spec`: When you want to generate Spec only

### Context
- Essential principles always loaded
- Additional principles specifiable via --frontend, --principles, etc.
```

---

## 10. References

- SOW: `sow.md`
- Research: `~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement.md`
- ADR 0001: /code modularization
