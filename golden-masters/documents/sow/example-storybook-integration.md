<!--
Golden Master: SOW - Storybook Integration

Selection criteria:
- Typical SOW for frontend features
- Includes Component API specification
- Documents user-verified facts (Storybook in use)
- Clear Pain Points analysis

Features:
- Reference example for UI/component tasks
- Component API section added to spec.md
- CSF3 format Stories generation

Source: ~/.claude/workspace/planning/2025-12-14-storybook-integration/
-->

# SOW: Storybook Integration Feature

Version: 1.1.0
Status: Draft (Revised)
Created: 2025-12-14
Updated: 2025-12-14

## Executive Summary

[✓] Add Storybook integration to Claude Code workflow, enabling automatic Stories skeleton generation from spec.md. Streamline frontend component sharing in team development.

## Problem Analysis

### Current State [✓]

- [✓] `/think` generates spec.md, but lacks detailed Component API definition
- [✓] After `/code` implementation, Stories are created manually
- [✓] No synchronization mechanism between spec.md and Stories
- [✓] Storybook already in use (user confirmed)

### Pain Points [→]

- [→] Dual management of component specifications and Stories
- [→] Stories update omissions easily occur when Props change
- [→] Component specification sharing among team members is ad hoc

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] Storybook in use - User confirmed
- [✓] Desires automatic Stories generation - User confirmed
- [✓] Wants generic solution (not project-specific) - User confirmed
- [✓] Team development, frontend-focused - User confirmed

### Working Assumptions (→)

- [→] Using Storybook 7+ (CSF3 format)
- [→] TypeScript + React is the main tech stack
- [→] Wants to utilize autodocs

### Unknown/Needs Verification (?)

- [?] Specific Storybook version
- [?] Existing Stories file structure pattern
- [?] Presence of design system

## Solution Design

### Proposed Approach [→]

3-layer implementation:

1. **Create new storybook-integration skill**
   - Component API specification template
   - Stories generation best practices
   - CSF3 format pattern collection

2. **/think extension**: Add Component API section to spec.md
   - Props definition (TypeScript interface)
   - Variations (variants, sizes, states)
   - Usage examples (code snippets)

3. **/code extension**: Stories skeleton generation
   - Auto-generate from spec.md Component API
   - Default, Variants, States Stories
   - autodocs support

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| A. Skill only | Simple, low cost | No automation | △ |
| B. /think + /code extension | Full automation | Large change scope | ◎ |
| C. Dedicated /storybook command | High independence | Separate from existing workflow | △ |

### Recommendation

**Option B** adopted - Confidence: [→]

Rationale:

- Natural integration with existing workflow (/think → /code)
- spec.md becomes Single Source of Truth for specifications
- Low additional learning cost

## Test Plan

### Unit Tests (Priority: High)

- [ ] Function: `generateComponentAPISection()` - Generate API section from Props
- [ ] Function: `generateStoryTemplate()` - Generate CSF3 format Story
- [ ] Function: `parseComponentSpec()` - Extract component specification from spec.md

### Integration Tests (Priority: Medium)

- [ ] Component API section generated on /think execution
- [ ] *.stories.tsx generated on /code execution
- [ ] Generated Stories renderable in Storybook

### E2E Tests (Priority: Low)

- [ ] Complete workflow: /think → /code → Stories display

## Acceptance Criteria

- [ ] [✓] storybook-integration skill created in ~/.claude/skills/
- [ ] [✓] spec.md includes Component API section on /think execution
- [ ] [→] *.stories.tsx generated with component implementation on /code execution
- [ ] [→] Generated Stories are CSF3 format with autodocs support
- [ ] [→] Props type definitions reflected in Stories argTypes
- [ ] [→] Consistency maintained with existing Stories (per EC-002 integration strategy: O/S/M/D options)

## Implementation Plan

### Phase 1: Skill Creation [Day 1]

1. Create `~/.claude/skills/storybook-integration/SKILL.md`
2. Create `references/csf3-patterns.md`
3. Create `references/component-api-template.md`

### Phase 2: /think Extension [Day 2]

**Target file**: `~/.claude/commands/think.md`

1. Add Component API section to spec.md template
   - Addition location: Within `## Specification Document (spec.md) Structure`
2. Add frontend detection logic
   - Auto-detection via `shouldGenerateComponentAPI()` function
3. Integration with existing UI specification section (Chapter 4)

### Phase 3: /code Extension [Day 3]

**Target file**: `~/.claude/commands/code.md`

1. Add logic to read component specification from spec.md
   - `parseComponentSpec()` function
2. Add Stories skeleton generation logic
   - `generateStoryTemplate()` function
   - Addition location: After `## Specification Context (Auto-Detection)`
3. Existing file detection & integration strategy (EC-002)
   - Implementation of O/S/M/D options

### Phase 4: Verification [Day 4]

1. Test in actual project
2. Update documentation

## Success Metrics

- [✓] Stories creation time: Manual 15min → Auto 2min
- [→] spec.md ↔ Stories divergence: 0 cases
- [→] Improved satisfaction with component specification sharing in team

## Risks & Mitigations

### High Confidence Risks (✓)

- **Risk**: Changes to existing /think, /code affect other features
  - Mitigation: Add frontend detection logic, disable for backend implementations

### Potential Risks (→)

- **Risk**: Incompatibility due to different Storybook versions
  - Mitigation: Assume CSF3 (Storybook 7+), handle older versions manually

### Unknown Risks (?)

- **Risk**: Generation quality for complex components
  - Mitigation: Limit to skeleton generation, details customized manually

## Verification Checklist

Before starting implementation, verify:

- [ ] All [?] items have been investigated
- [ ] Assumptions [→] have been validated
- [ ] Facts [✓] have current evidence
