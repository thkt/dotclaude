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

## Dynamic Project Context

### Current State Analysis

```bash
!`git branch --show-current`
!`git log --oneline -5`
```

## SOW Structure

### Required Sections

```markdown
# SOW: [Feature Name]
Version: 1.0.0
Status: Draft
Created: [Date]

## Executive Summary
[High-level overview]

## Problem Analysis
[Current issues and challenges]

## Solution Design
[Proposed approach and alternatives]

## Test Plan

### Unit Tests (Priority: High)
- [ ] Function: `functionName()` - Description
- [ ] Function: `functionName()` - Edge case description

### Integration Tests (Priority: Medium)
- [ ] API/Flow: Description
- [ ] API/Flow: Error case description

### E2E Tests (Priority: Low)
- [ ] User flow: Description

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation Plan
[Phases and steps]

## Success Metrics
[Measurable outcomes]

## Risks & Mitigations
[Potential issues and solutions]
```

## Key Features

### 1. Problem Definition

- Clear articulation of the issue
- Impact assessment
- Stakeholder identification

### 2. Solution Exploration

- Multiple approaches considered
- Trade-off analysis
- Recommendation with rationale

### 3. Acceptance Criteria

- Clear, testable criteria
- User-facing outcomes
- Technical requirements

### 4. Risk Assessment

- Technical risks
- Timeline risks
- Mitigation strategies

## Output

SOW saved to: `~/.claude/workspace/sow/[timestamp]-[feature]/sow.md`

Features:

- Structured planning document
- Clear acceptance criteria
- Risk assessment
- Implementation roadmap

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

### Occam's Razor

- Simple, static documents
- No complex automation
- Clear separation of concerns

### Progressive Enhancement

- Start with basic SOW
- Add detail as needed
- No premature optimization

### Readable Documentation

- Clear structure
- Plain language
- Actionable criteria
