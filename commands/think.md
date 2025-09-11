---
name: think
description: 検証可能な動的SOWを生成
priority: high
suitable_for:
  scale: [small, medium, large]
  type: [fix, feature, refactor, optimize]
  understanding: "≥ 50%"
  urgency: [low, medium]
aliases: [plan, analyze, sow]
timeout: 60
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Bash(find:*), Bash(cat:*), Read, Write, Glob, Grep, LS, Task, TodoWrite
context:
  complexity: "assessed"
  risks: "evaluated"
  dependencies: "mapped"
  solutions: "scored"
  validation_enabled: true
  output_dir: "workspace/sow/"
---

# /think - Verifiable SOW Generator

## Purpose

Create comprehensive, verifiable Statement of Work (SOW) with dynamic validation points and automated progress tracking.

**Enhancement**: Extends standard /think with validation criteria, metrics tracking, and TodoWrite integration.

## Dynamic Project Context

### Current State Analysis

```bash
!`git branch --show-current`
!`git log --oneline -5`
!`find . -name "*.test.*" -o -name "*.spec.*" | wc -l`
```

## SOW Structure

### Required Sections

```markdown
# SOW: [Feature Name]
Version: 1.0.0
Status: Draft
Created: [Date]

## Executive Summary
[Problem and solution overview]

## ✅ Acceptance Criteria
<!--validation:criteria-->
- [ ] AC-001: [Specific requirement] <!--todo-id:auto-->
- [ ] AC-002: [Specific requirement] <!--todo-id:auto-->
- [ ] AC-003: [Specific requirement] <!--todo-id:auto-->
<!--validation:end-->

## 📊 Validation Points
<!--validation:yaml-->
validations:
  - id: VAL-001
    type: functional
    description: "[What to validate]"
    test_command: "npm test -- [specific test]"
    expected: "[Expected result]"
    auto_check: true
<!--validation:end-->

## 🎯 Success Metrics
<!--metrics:auto-->
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test Coverage | >80% | - | ⏳ |
| Response Time | <200ms | - | ⏳ |
| Build Status | Passing | - | ⏳ |
<!--metrics:end-->

## 📈 Implementation Progress
<!--progress:auto-->
Overall: 0%
Tasks: 0/[total]
Updated: [timestamp]
<!--progress:end-->
```

## Analysis Process

### Phase 1: Problem Understanding

1. **Problem Definition** with evidence
2. **Impact Analysis** on systems and users
3. **Root Cause** identification
4. **Constraints** evaluation

### Phase 2: Solution Architecture

1. **Generate Solutions** (3+ alternatives)
2. **Score Solutions** (0.0-1.0 confidence)
3. **Risk Assessment** per solution
4. **Select Optimal** based on principles

### Phase 3: Validation Design

1. **Define Acceptance Criteria** (measurable)
2. **Create Validation Points** (testable)
3. **Set Success Metrics** (trackable)
4. **Link TodoWrite Tasks** (auto-generated)

## Decision Trace

### Problem Analysis (Confidence: X.XX)

```markdown
- Input: [User request]
- Category: [Type]
- Evidence: [Specific indicators]
- Similar cases: `git log --grep="[keyword]"`
```

### Solution Selection (Confidence: X.XX)

```markdown
Option A: [Approach] → Score: X.X
  Pros: [Benefits]
  Cons: [Drawbacks]

Option B: [Alternative] → Score: X.X
  Pros: [Benefits]
  Cons: [Drawbacks]

Selected: [Option] because [rationale]
```

## Implementation Plan

### Tasks with TodoWrite Integration

```markdown
1. [Task description] → AC-001
2. [Task description] → AC-002
3. [Task description] → AC-003
```

Each task automatically:

- Creates TodoWrite entry
- Links to Acceptance Criteria
- Updates SOW on completion

## Validation Configuration

### Auto-Update Hooks

```yaml
auto_update:
  on_todo_complete: true
  on_test_run: true
  on_commit: true

tracking:
  todo_items: true
  test_results: true
  metrics: true
```

## Success Criteria

### Pass Conditions

- All Acceptance Criteria checked
- All Validation Points passing
- Metrics within targets
- No critical issues

## Output

SOW saved to: `workspace/sow/[timestamp]-[feature]/sow.md`

With:

- Verifiable criteria
- Automated tracking
- Progress monitoring
- Test integration

## Integration

```bash
/think "feature"    # Create verifiable SOW
/sow               # Monitor progress
/validate          # Check conformance
```

## Example Usage

```bash
/think "Add user authentication with OAuth"
```

Generates:

- 10-15 Acceptance Criteria
- 5-8 Validation Points
- TodoWrite tasks with IDs
- Auto-update configuration

## Related Commands

- `/sow` - View SOW progress
- `/validate` - Validate implementation
- `/code` - Implement with TDD
