---
name: think
description: 構造化された計画文書（SOW）を生成
priority: high
suitable_for:
  scale: [small, medium, large]
  type: [fix, feature, refactor, optimize]
  understanding: "≥ 50%"
  urgency: [low, medium]
aliases: [plan, analyze, sow]
timeout: 60
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Read, Write, Glob, Grep, LS
context:
  complexity: "assessed"
  risks: "evaluated"
  dependencies: "mapped"
  solutions: "scored"
---

# /think - Simple SOW Generator

## Purpose

Create a comprehensive Statement of Work (SOW) as a static planning document for feature development or problem solving.

**Simplified**: Focus on planning and documentation without complex automation.

**Output Verifiability**: All analyses, assumptions, and solutions marked with ✓/→/? to distinguish facts from inferences per AI Operation Principle #4.

## Dynamic Project Context

### Current State Analysis

```bash
!`git branch --show-current`
!`git log --oneline -5`
```

## SOW Structure

### Required Sections

**IMPORTANT**: Use ✓/→/? markers throughout to distinguish facts, inferences, and assumptions.

```markdown
# SOW: [Feature Name]
Version: 1.0.0
Status: Draft
Created: [Date]

## Executive Summary
[High-level overview with confidence markers]

## Problem Analysis
Use markers to indicate confidence:
- [✓] Verified issues (confirmed by logs, user reports, code review)
- [→] Inferred problems (reasonable deduction from symptoms)
- [?] Suspected issues (requires investigation)

## Assumptions & Prerequisites
**NEW SECTION**: Explicitly state what we're assuming to be true.

### Verified Facts (✓)
- [✓] Fact 1 - Evidence: [source]
- [✓] Fact 2 - Evidence: [file:line]

### Working Assumptions (→)
- [→] Assumption 1 - Based on: [reasoning]
- [→] Assumption 2 - Inferred from: [evidence]

### Unknown/Needs Verification (?)
- [?] Unknown 1 - Need to check: [what/where]
- [?] Unknown 2 - Requires: [action needed]

## Solution Design
### Proposed Approach
[Main solution with confidence level]

### Alternatives Considered
1. [✓/→/?] Option A - [Pro/cons with evidence]
2. [✓/→/?] Option B - [Pro/cons with reasoning]

### Recommendation
[Chosen solution] - Confidence: [✓/→/?]
Rationale: [Evidence-based reasoning]

## Test Plan

### Unit Tests (Priority: High)
- [ ] Function: `calculateDiscount(count)` - Returns 20% for 15+ purchases
- [ ] Function: `calculateDiscount(count)` - Returns 10% for <15 purchases
- [ ] Function: `calculateDiscount(count)` - Handles zero/negative input

### Integration Tests (Priority: Medium)
- [ ] API: POST /users - Creates user with valid data
- [ ] API: POST /users - Rejects duplicate email with 409

### E2E Tests (Priority: Low)
- [ ] User registration flow - Complete signup process

## Acceptance Criteria
Mark each with confidence:
- [ ] [✓] Criterion 1 - Directly from requirements
- [ ] [→] Criterion 2 - Inferred from user needs
- [ ] [?] Criterion 3 - Assumed, needs confirmation

## Implementation Plan
[Phases and steps with dependencies noted]

## Success Metrics
- [✓] Metric 1 - Measurable: [how]
- [→] Metric 2 - Estimated: [basis]

## Risks & Mitigations
### High Confidence Risks (✓)
- Risk 1 - Evidence: [past experience, data]
- Mitigation: [specific action]

### Potential Risks (→)
- Risk 2 - Inferred from: [analysis]
- Mitigation: [contingency plan]

### Unknown Risks (?)
- Risk 3 - Monitor: [what to watch]
- Mitigation: [preparedness]

## Verification Checklist
Before starting implementation, verify:
- [ ] All [?] items have been investigated
- [ ] Assumptions [→] have been validated
- [ ] Facts [✓] have current evidence
```

## Key Features

### 1. Problem Definition

- Clear articulation of the issue
- Impact assessment
- Stakeholder identification
- **Confidence markers**: ✓ verified / → inferred / ? suspected

### 2. Assumptions & Prerequisites (NEW)

- Explicit statement of what's assumed
- Distinction between facts and inferences
- Clear identification of unknowns
- **Prevents**: Building on false assumptions

### 3. Solution Exploration

- Multiple approaches considered
- Trade-off analysis with evidence
- Recommendation with rationale
- **Each option marked**: ✓/→/? for confidence level

### 4. Acceptance Criteria

- Clear, testable criteria
- User-facing outcomes
- Technical requirements
- **Confidence per criterion**: Know which need verification

### 5. Risk Assessment

- Technical risks with evidence
- Timeline risks with reasoning
- Mitigation strategies
- **Categorized by confidence**: ✓ confirmed / → potential / ? unknown

## Output

### SOW Location (Auto-Detection)

The SOW file location is automatically determined using git-style directory search:

1. **Search upward** from current directory for `.claude/` directory
2. **If found**: Save to `.claude/workspace/sow/[timestamp]-[feature]/sow.md` (project-local)
3. **If not found**: Save to `~/.claude/workspace/sow/[timestamp]-[feature]/sow.md` (global)

**Feedback**: The save location is displayed with context indicator:

- `✅ SOW saved to: .claude/workspace/sow/... (Project-local: .claude/ detected)`
- `✅ SOW saved to: ~/.claude/workspace/sow/... (Global: no .claude/ found)`

**Benefits**:

- **Zero-config**: Automatically adapts to project structure
- **Team sharing**: Project-local enables git-based sharing
- **Personal notes**: Global storage for exploratory work
- **Flexible**: Create `.claude/` to switch to project-local mode

Features:

- Structured planning document
- Clear acceptance criteria with confidence markers
- Explicit assumptions and prerequisites section
- Risk assessment by confidence level
- Implementation roadmap
- **Output Verifiability**: All claims marked ✓/→/? with evidence

## Integration

```bash
/think "feature"    # Create planning SOW
/todos              # Track implementation separately
```

## Example Usage

```bash
/think "Add user authentication with OAuth"
```

Generates:

- Comprehensive planning document
- 8-12 Acceptance Criteria
- Risk assessment
- Implementation phases

## Simplified Workflow

1. **Planning Phase**
   - Use `/think` to create SOW
   - Review and refine plan

2. **Execution Phase**
   - Use TodoWrite for task tracking
   - Reference SOW for requirements

3. **Review Phase**
   - Check against acceptance criteria
   - Update documentation as needed

## Related Commands

- `/code` - Implementation with TDD
- `/test` - Testing and verification
- `/review` - Code review

## Applied Principles

### Output Verifiability (AI Operation Principle #4)

- **Distinguish facts from inferences**: ✓/→/? markers
- **Provide evidence**: File paths, line numbers, sources
- **State confidence levels**: Explicit about certainty
- **Admit unknowns**: [?] for items needing investigation
- **Prevents**: Building plans on false assumptions

### Occam's Razor

- Simple, static documents
- No complex automation
- Clear separation of concerns

### Progressive Enhancement

- Start with basic SOW
- Add detail as needed
- No premature optimization
- **Assumptions section**: Identify what to verify first

### Readable Documentation

- Clear structure
- Plain language
- Actionable criteria
- **Confidence markers**: Visual clarity for trust level
