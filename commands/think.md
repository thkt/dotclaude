---
description: >
  Create a comprehensive Statement of Work (SOW) for feature development or problem solving.
  Use when planning complex tasks, defining acceptance criteria, or structuring implementation approaches.
  Ideal for tasks requiring detailed analysis, risk assessment, and structured planning documentation.
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Read, Write, Glob, Grep, LS, Task
model: inherit
argument-hint: "[feature or problem description]"
---

# /think - Simple SOW Generator

## Purpose

Create a comprehensive Statement of Work (SOW) as a static planning document for feature development or problem solving.

**Simplified**: Focus on planning and documentation without complex automation.

**Output Verifiability**: All analyses, assumptions, and solutions marked with ✓/→/? to distinguish facts from inferences per AI Operation Principle #4.

## Context Engineering Integration

**IMPORTANT**: Before starting analysis, check for existing research context.

### Automatic Context Discovery

Use Glob to search for existing research context:

- Project-local: `.claude/workspace/research/*-context.md`
- Global: `~/.claude/workspace/research/*-context.md`

### Context Loading Strategy

1. **Check for recent research**: Look for context files in the last 24 hours
2. **Prioritize project-local**: `.claude/workspace/research/` over global `~/.claude/workspace/research/`
3. **Extract key information**: Purpose, Prerequisites, Available Data, Constraints
4. **Integrate into planning**: Use research findings to inform SOW creation

### Context-Informed Planning

If research context is found:

- **🎯 Purpose**: Align SOW goals with research objectives
- **📋 Prerequisites**: Build on verified facts, validate assumptions
- **📊 Available Data**: Reference discovered files and stack
- **🔒 Constraints**: Respect identified limitations

**Benefits**:

- **Higher confidence**: Planning based on actual codebase knowledge
- **Fewer assumptions**: Replace unknowns with verified facts
- **Better estimates**: Realistic based on discovered complexity
- **Aligned goals**: Purpose-driven from research to implementation

## Codebase Analysis Phase

### Purpose

Before creating SOW, analyze the existing codebase to understand:

- Similar existing implementations
- Current architecture patterns
- Impact scope and affected modules
- Dependencies and integration points

### When to Invoke Plan Agent

**Default behavior** - Plan agent is invoked by default unless explicitly greenfield:

```typescript
// Decision logic
const needsCodebaseAnalysis =
  // Default: invoke Plan agent unless explicitly greenfield
  !/new project|from scratch|prototype|poc/i.test(featureDescription);
```

**Skip conditions** - Plan agent is NOT invoked only for:

- Greenfield projects ("new project", "from scratch")
- Prototypes and POCs
- Standalone utilities
- Documentation-only changes

### Plan Agent Invocation

When conditions are met, invoke Plan agent with medium thoroughness:

```typescript
Task({
  subagent_type: "Plan",
  model: "haiku",
  thoroughness: "medium",
  description: "Analyze codebase for feature context",
  prompt: `
Feature: "${featureDescription}"

Investigate:
1. Existing patterns: similar implementations (file:line), architecture [✓]
2. Related modules: affected files, dependencies, integration points [✓]
3. Tech stack: libraries, conventions, testing [✓]
4. Recommendations: approach, reusable modules, challenges [→]
5. Impact: scope estimate, breaking changes, risks [→]

Return findings with markers: [✓] verified, [→] inferred, [?] unknown.
  `
})
```

### Integration with SOW Generation

Plan agent findings are incorporated into SOW sections:

**Problem Analysis**:

```markdown
### Current State [✓]
${planFindings.existingPatterns}
- Located at: ${planFindings.fileReferences}
- Currently using: ${planFindings.techStack}
```

**Solution Design**:

```markdown
### Recommended Approach [→]
Based on codebase analysis:
- Follow pattern from: ${planFindings.similarImplementation}
- Integrate with: ${planFindings.integrationPoints}
- Reuse: ${planFindings.reusableModules}
```

**Dependencies**:

```markdown
### Existing [✓]
${planFindings.currentDependencies}

### New [→]
${inferredNewDependencies}
```

**Risks & Mitigations**:

```markdown
### High Confidence Risks [✓]
${planFindings.identifiedRisks}

### Potential Risks [→]
${planFindings.impactAssessment}
```

### Benefits

- **Higher confidence**: Planning based on actual codebase knowledge
- **Fewer assumptions**: Replace [?] unknowns with [✓] verified facts
- **Better alignment**: Solutions consistent with existing patterns
- **Realistic estimates**: Based on discovered complexity
- **Reduced surprises**: Identify integration challenges upfront

### Cost-Benefit Analysis

| Metric | Without Plan | With Plan |
|--------|-------------|-----------|
| **SOW Accuracy** | [→] 65-75% | [✓] 85-95% |
| **Assumptions** | Many [?] items | Mostly [✓] items |
| **Implementation surprises** | High | Low |
| **Additional cost** | $0 | +$0.05-0.15 |
| **Additional time** | 0s | +5-15s |

[→] Haiku-powered for minimal cost impact

## Dynamic Project Context

### Current State Analysis

**Note**: Git context is optional. Skip if not in a git repository.

```bash
# Only if in git repository (returns fallback message if not):
!`git branch --show-current 2>/dev/null || echo "(not a git repository)"`
!`git log --oneline -5 2>/dev/null || echo "(no git history)"`
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

### 2. Assumptions & Prerequisites

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

### Dual-Document Generation

The `/think` command generates **two complementary documents**:

1. **SOW (Statement of Work)** - High-level planning
2. **Spec (Specification)** - Implementation-ready details

### Generation Process

**IMPORTANT**: Both documents MUST be generated using the Write tool:

1. **Create output directory**: `.claude/workspace/planning/[timestamp]-[feature-name]/`
2. **Generate sow.md**: Use SOW template structure (sections 1-8)
3. **Generate spec.md**: Use Spec template structure (sections 1-10)
4. **Confirm creation**: Display save locations with ✅ indicators

**Example**:

```bash
# After generating both documents
✅ SOW saved to: .claude/workspace/planning/2025-01-18-auth-feature/sow.md
✅ Spec saved to: .claude/workspace/planning/2025-01-18-auth-feature/spec.md
```

### Output Location (Auto-Detection)

Both files are saved using git-style directory search:

1. **Search upward** from current directory for `.claude/` directory
2. **If found**: Save to `.claude/workspace/planning/[timestamp]-[feature]/` (project-local)
3. **If not found**: Save to `~/.claude/workspace/planning/[timestamp]-[feature]/` (global)

**Output Structure**:

```text
.claude/workspace/planning/[timestamp]-[feature]/
├── sow.md       # Statement of Work (planning)
└── spec.md      # Specification (implementation details)
```

**Feedback**: The save location is displayed with context indicator:

- `✅ SOW saved to: .claude/workspace/planning/... (Project-local: .claude/ detected)`
- `✅ Spec saved to: .claude/workspace/planning/... (Project-local: .claude/ detected)`

**Benefits**:

- **Zero-config**: Automatically adapts to project structure
- **Team sharing**: Project-local enables git-based sharing
- **Personal notes**: Global storage for exploratory work
- **Flexible**: Create `.claude/` to switch to project-local mode
- **Integrated workflow**: spec.md automatically used by `/review` and `/code`

Features:

- **SOW**: Planning document with acceptance criteria
- **Spec**: Implementation-ready specifications
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
   - Use `/think` to create SOW and Spec
   - **Automatic codebase analysis** (Plan agent invoked if applicable)
   - Review and refine plan with verified context

2. **Auto Review Phase**
   - **sow-spec-reviewer** automatically reviews generated documents
   - 100-point scoring with 90-point pass threshold
   - SOW ↔ Spec consistency check
   - If PASS → proceed to Execution Phase
   - If CONDITIONAL → fix issues and re-review
   - If FAIL → re-run `/think` with clarifications

3. **Execution Phase**
   - Use TodoWrite for task tracking
   - Reference SOW for requirements

4. **Review Phase**
   - Check against acceptance criteria
   - Update documentation as needed

## Auto Review Integration

### Automatic Document Review

After generating sow.md and spec.md, automatically invoke the sow-spec-reviewer:

```typescript
Task({
  subagent_type: "sow-spec-reviewer",
  description: "Auto-review SOW/Spec",
  prompt: `
    Review the just-generated documents:
    - SOW: ${sowPath}
    - Spec: ${specPath}

    Apply 100-point scoring with 90-point pass threshold.
    Check SOW ↔ Spec consistency.

    Scoring criteria (each 25 points):
    - Accuracy: Appropriate use of confidence markers (✓/→/?)
    - Completeness: Coverage of required sections
    - Relevance: Alignment with objectives, appropriate scope
    - Actionability: Concrete enough for implementation

    Report results.
  `
})
```

### Review Flow

```text
/think "feature"
    ↓
Generate sow.md + spec.md
    ↓
Auto-invoke sow-spec-reviewer
    ↓
┌─────────────────────────────────────┐
│ Score >= 90: ✅ PASS                │
│ → Can proceed to implementation     │
│   phase (/code)                     │
├─────────────────────────────────────┤
│ Score 70-89: ⚠️ CONDITIONAL         │
│ → Show issues, request fixes        │
│ → Re-review after fixes             │
├─────────────────────────────────────┤
│ Score < 70: ❌ FAIL                 │
│ → Major revision needed             │
│ → Re-run /think with clarifications │
└─────────────────────────────────────┘
```

### Skip Auto-Review

To skip automatic review (not recommended):

```bash
/think "feature" --skip-review
```

### Manual Re-Review

To manually trigger a review of existing documents:

```typescript
Task({
  subagent_type: "sow-spec-reviewer",
  description: "Manual SOW/Spec review",
  prompt: "Review documents at: .claude/workspace/planning/[path]/"
})
```

## Related Commands

- `/code` - Implementation with TDD
- `/test` - Testing and verification
- `/review` - Code review

## Specification Document (spec.md) Structure

The spec.md provides implementation-ready details that complement the high-level SOW.

### Spec Template

```markdown
# Specification: [Feature Name]

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: [Date]

---

## 1. Functional Requirements

### 1.1 Core Functionality
[✓] FR-001: [Clear, testable requirement]
- Input: [Expected inputs with types]
- Output: [Expected outputs]
- Validation: [Validation rules]

[→] FR-002: [Inferred requirement]
- [Details with confidence marker]

### 1.2 Edge Cases
[→] EC-001: [Edge case description]
- Action: [How to handle]
- [?] To confirm: [Unclear aspects]

---

## 2. API Specification (Backend features)

### 2.1 [HTTP METHOD] /path/to/endpoint

**Request**:
```json
{
  "field": "type and example"
}
```

**Response (Success - 200)**:

```json
{
  "result": "expected structure"
}
```

**Response (Error - 4xx/5xx)**:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

---

## 3. Data Model

### 3.1 [Entity Name]

```typescript
interface EntityName {
  id: string;              // Description, constraints
  field: type;             // Purpose, validation rules
  created_at: Date;
  updated_at: Date;
}
```

### 3.2 Relationships

- Entity A → Entity B: [Relationship type and constraints]

---

## 4. UI Specification (Frontend features)

### 4.1 [Screen/Component Name]

**Layout**:

- Element 1: position, sizing, placeholder text
- Element 2: styling details

**Validation**:

- Real-time: [When to validate]
- Submit: [Final validation rules]
- Error display: [How to show errors]

**Responsive**:

- Mobile (< 768px): [Layout adjustments]
- Desktop: [Default layout]

### 4.2 User Interactions

- Action: [User action] → Result: [System response]

### 4.x Component API: [ComponentName] (Frontend components only)

**Auto-Generation Logic** (shouldGenerateComponentAPI):

```text
Check if feature description contains these keywords:
├─ Frontend: component, UI, button, form, modal, dialog, card...
├─ Backend (exclude): api endpoint, database, CLI, migration, backend...
│
└─ Has frontend keywords AND NOT backend keywords?
    ├─ YES → Generate this section
    └─ NO  → Skip this section
```

See: [@~/.claude/skills/storybook-integration/SKILL.md] for full keyword list.

#### Description

[Component purpose and role in 1-2 sentences]

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | Content to display |
| variant | 'primary' \| 'secondary' | - | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | Size variant |
| disabled | boolean | - | false | Disable interactions |
| onClick | () => void | - | - | Click handler |

#### Variants

**variant**

- `primary`: Primary style - [description]
- `secondary`: Secondary style - [description]

**size**

- `sm`: Small (32px) - [use case]
- `md`: Medium (40px) - [use case]
- `lg`: Large (48px) - [use case]

#### States

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | Normal state | Base styling |
| hover | Mouse hover | [change] |
| disabled | Non-interactive | Reduced opacity |

#### Usage Examples

```tsx
// Basic usage
<ComponentName>Content</ComponentName>

// With variants
<ComponentName variant="secondary" size="lg">
  Large Secondary
</ComponentName>
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

[✓] NFR-001: [Measurable performance requirement]
[→] NFR-002: [Inferred performance target]

### 5.2 Security

[✓] NFR-003: [Security requirement with evidence]
[→] NFR-004: [Security consideration]

### 5.3 Accessibility

[→] NFR-005: [Accessibility standard]
[?] NFR-006: [Needs confirmation]

---

## 6. Dependencies

### 6.1 External Libraries

[✓] library-name: ^version (purpose)
[→] optional-library: ^version (if needed, basis)

### 6.2 Internal Services

[✓] ServiceName: [Purpose and interface]
[?] UnclearService: [Needs investigation]

---

## 7. Test Scenarios

### 7.1 Unit Tests

```typescript
describe('FeatureName', () => {
  it('[✓] handles typical case', () => {
    // Given: setup
    // When: action
    // Then: expected result
  });

  it('[→] handles edge case', () => {
    // Inferred behavior
  });
});
```

### 7.2 Integration Tests

[Key integration scenarios]

### 7.3 E2E Tests (if UI)

[Critical user flows]

---

## 8. Known Issues & Assumptions

### Assumptions (→)

1. [Assumption 1 - basis for assumption]
2. [Assumption 2 - needs confirmation]

### Unknown / Need Verification (?)

1. [Unknown 1 - what needs checking]
2. [Unknown 2 - where to verify]

---

## 9. Implementation Checklist

- [ ] [Specific implementation step 1]
- [ ] [Specific implementation step 2]
- [ ] Unit tests (coverage >80%)
- [ ] Integration tests
- [ ] Documentation update

---

## 10. References

- SOW: `sow.md`
- Related specs: [Links to related specifications]
- API docs: [Links to API documentation]

```markdown

### Spec Generation Guidelines

1. **Use ✓/→/? markers consistently** - Align with SOW's Output Verifiability
2. **Be implementation-ready** - Developers should be able to code directly from spec
3. **Include concrete examples** - API requests/responses, data structures, UI layouts
4. **Define test scenarios** - Clear Given-When-Then format
5. **Document unknowns explicitly** - [?] markers for items requiring clarification

### When to Generate Spec

- **Always with SOW**: Spec is generated alongside SOW by default
- **Update together**: When SOW changes, update spec accordingly
- **Reference in reviews**: `/review` will automatically reference spec.md

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
