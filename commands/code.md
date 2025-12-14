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

### Discover Latest Spec

Search for spec.md in SOW workspace using Glob:

- Project-local: `.claude/workspace/sow/**/spec.md`
- Global: `~/.claude/workspace/sow/**/spec.md`

### Load Specification for Implementation

**If spec.md exists**, use it as implementation guide:

- **Functional Requirements (FR-xxx)**: Define what to implement
- **API Specifications**: Provide exact request/response structures
- **Data Models**: Show expected data structures and validation rules
- **UI Specifications**: Define layout, validation, and interactions
- **Test Scenarios**: Guide test case creation with Given-When-Then
- **Implementation Checklist**: Track implementation progress

**If spec.md does not exist**:

- Proceed with implementation based on available requirements
- Consider running `/think` first to generate specification
- Document assumptions and design decisions inline

This ensures implementation aligns with specification from the start.

## Storybook Integration (Optional)

### Automatic Stories Generation

When spec.md contains a **Component API section** (`### 4.x Component API:`), automatically generate Stories.

**Trigger Condition**:

- spec.md contains `### 4.x Component API:` section
- References storybook-integration skill

**Process**:

1. Parse ComponentSpec from spec.md
2. Check for existing Stories file
3. Generate or update based on user choice

### Stories Generation Flow

```text
Component API section in spec.md?
    ├─ YES → parseComponentSpec()
    │         ↓
    │   Existing Stories file?
    │         ├─ YES → Show integration strategy (EC-002)
    │         └─ NO  → generateStoryTemplate()
    └─ NO  → Normal implementation flow (skip)
             Log: "Component API not found in spec.md, skipping Stories generation"
```

### Existing Stories Integration (EC-002)

Options when existing Stories file is found:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Existing Stories file detected

File: [path/to/Component.stories.tsx]
Stories count: [count]

[O] Overwrite - Completely replace existing file
[S] Skip - Keep existing file, do not generate
[M] Merge (manual) - Show diff, integrate manually
[D] Diff only - Append only new Stories

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Generated Stories Format (CSF3)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Components/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    // Auto-generated from Props table
  },
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = { args: { /* from Usage Examples */ } };
// Variant Stories...
// State Stories...
```

See: [@~/.claude/skills/storybook-integration/SKILL.md] for full template.

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

**Purpose**: Generate test cases in **skip state** from specification, then activate one-by-one with user confirmation for true Baby Steps TDD.

**When to use**: When spec.md exists and contains test scenarios.

#### Step 1: Generate Skipped Tests

Use test-generator with skip mode to create test scaffold:

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate skipped tests from specification",
  prompt: `
Feature: "${featureDescription}"
Spec: ${specContent}

Generate tests in SKIP MODE:
1. FR-xxx requirements → skipped test cases [✓]
2. Given-When-Then scenarios → skipped executable tests [✓]
3. Order tests: simple → complex (Baby Steps order) [→]
4. Use framework-appropriate skip markers:
   - Jest/Vitest: it.skip() + // TODO: [SKIP] comment
   - Unknown: Comment out + // TODO: [SKIP] marker

Output: Test file with ALL tests in skip state.
Include activation order recommendation.
  `
})
```

#### Step 2: Display Test Queue

After generation, display the test activation queue:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Test Queue (Baby Steps Order)

| # | Test Name | Status | Complexity |
|---|-----------|--------|------------|
| 1 | handles zero input | ⏸️ SKIP | Simple |
| 2 | calculates basic case | ⏸️ SKIP | Basic |
| 3 | applies threshold logic | ⏸️ SKIP | Medium |
| 4 | handles edge cases | ⏸️ SKIP | Complex |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Step 3: Interactive Activation Loop

For each test in the queue, prompt user before activation:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 RGRC Cycle 1/4

Activate the next test?

📝 Test: "handles zero input"
📁 File: src/utils/discount.test.ts:15
📋 From: FR-001 (Zero purchase handling)

```typescript
it('handles zero input', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Y] Activate and enter Red phase
[S] Skip to next test
[Q] Quit test generation

```markdown

#### Step 4: Activate and Enter Red Phase

On user confirmation (Y):

1. **Remove skip marker** from the test
2. **Run test** → Verify it fails (Red phase)
3. **Proceed to Green phase** → Implement minimal code
4. **Refactor if needed**
5. **Return to Step 3** for next test

```typescript
// Before activation:
it.skip('handles zero input', () => {
  // TODO: [SKIP] FR-001
  expect(calculateDiscount(0)).toBe(0.1)
})

// After activation:
it('handles zero input', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

#### Progress Tracking

Display progress after each cycle:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Progress: 2/4 tests complete

| # | Test Name | Status |
|---|-----------|--------|
| 1 | handles zero input | ✅ PASS |
| 2 | calculates basic case | ✅ PASS |
| 3 | applies threshold logic | ⏸️ SKIP |
| 4 | handles edge cases | ⏸️ SKIP |

🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Benefits**:

- **True Baby Steps**: One test at a time, user-controlled pace
- **Spec-driven**: Tests derived from Given-When-Then scenarios
- **Confirmation before action**: No surprises, intentional progress
- **Clear progress**: Always know where you are in the cycle

**Integration with TDD**:

```text
Phase 0: test-generator creates ALL tests in skip state
  ↓
Loop:
  ├─ Display next skipped test
  ├─ Ask: "Activate this test?" (Y/S/Q)
  ├─ If Y:
  │   ├─ Remove skip marker
  │   ├─ Red: Run test (fails)
  │   ├─ Green: Implement
  │   ├─ Refactor: Clean up
  │   └─ Commit: Save state
  └─ Next test
  ↓
All tests activated and passing
```

### 1. Test-Driven Development (TDD) as t_wada would

**Goal**: "Clean code that works" - Ron Jeffries

#### Baby Steps - The Foundation of TDD

**Core Principle**: Make the smallest possible change at each step

##### Why Baby Steps Matter

- **Immediate error localization**: When test fails, the cause is in the last tiny change
- **Continuous working state**: Code is always seconds away from green
- **Rapid feedback**: Each step takes 1-2 minutes max
- **Confidence building**: Small successes compound into major features

##### Baby Steps in Practice

```typescript
// ❌ Big Step - Multiple changes at once
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const afterTax = subtotal * (1 + tax);
  const afterDiscount = afterTax * (1 - discount);
  return afterDiscount;
}

// ✅ Baby Steps - One change at a time
// Step 1: Return zero (make test pass minimally)
function calculateTotal(items) {
  return 0;
}

// Step 2: Basic sum (next test drives this)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Step 3: Add tax support (only when test requires it)
// ... continue in tiny increments
```

##### Baby Steps Rhythm

1. **Write smallest failing test** (30 seconds)
2. **Make it pass with minimal code** (1 minute)
3. **Run tests** (10 seconds)
4. **Tiny refactor if needed** (30 seconds)
5. **Commit if green** (20 seconds)

Total cycle: ~2 minutes

#### Test Generation from Plan (Pre-Red)

Before entering the RGRC cycle, automatically generate tests from SOW:

```bash
# 1. Check for SOW with test plan
.claude/workspace/sow/[feature-name]/sow.md

# 2. If test plan exists, invoke test-generator
Task(
  subagent_type="test-generator",
  description="Generate tests from SOW",
  prompt="Generate tests from SOW test plan"
)

# 3. Verify generated tests
npm test -- --listTests | grep -E "\.test\.|\.spec\."
```

**When to generate:**

- SOW contains "Test Plan" section
- No existing tests for planned features
- User requests test generation

**Skip conditions:**

- Tests already exist
- No SOW test plan defined
- Quick fix mode

#### Enhanced RGRC Cycle with Real-time Feedback

1. **Red Phase** (Confidence Target: 0.9)

   ```bash
   npm test -- --testNamePattern="[current test]" | grep -E "FAIL|PASS"
   ```

   - Write failing test with clear intent (or use generated tests)
   - Verify failure reason matches expectation
   - Document understanding via test assertions
   - **Exit Criteria**: Test fails for expected reason

2. **Green Phase** (Confidence Target: 0.7)

   ```bash
   npm test -- --watch --testNamePattern="[current test]"
   ```

   - Minimal implementation to pass
   - Quick solutions acceptable
   - Focus on functionality over form
   - **Exit Criteria**: Test passes consistently

3. **Refactor Phase** (Confidence Target: 0.95)

   ```bash
   npm test | tail -5 | grep -E "Passing|Failing"
   ```

   - Apply SOLID principles
   - Remove duplication (DRY)
   - Improve naming and structure
   - Extract abstractions
   - **Exit Criteria**: All tests green, code clean

4. **Commit Phase** (Confidence Target: 1.0)
   - Quality checks pass
   - Coverage maintained/improved
   - Ready for stable commit
   - User executes git commands

#### Advanced TodoWrite Integration

Real-time tracking with confidence scoring:

```markdown
# Implementation: [Feature Name]
## Scenarios (Total Confidence: 0.85)
1. ⏳ User registration with valid email [C: 0.9]
2. ⏳ Registration fails with invalid email [C: 0.8]
3. ⏳ Duplicate email prevention [C: 0.85]

## Current RGRC Cycle - Scenario 1
### Red Phase (Started: 14:23)
1.1 ✅ Write failing test [C: 0.95] ✓ 2 min
1.2 ✅ Verify correct failure [C: 0.9] ✓ 30 sec

### Green Phase (Active: 14:26)
1.3 ❌ Implement registration logic [C: 0.7] ⏱️ 3 min
1.4 ⏳ Test passes consistently [C: pending]

### Refactor Phase (Pending)
1.5 ⏳ Apply SOLID principles [C: pending]
1.6 ⏳ Extract validation logic [C: pending]

### Quality Gates
- 🧪 Tests: 12/14 passing
- 📊 Coverage: 78% (target: 80%)
- 🔍 Lint: 2 warnings
- 🔷 Types: All passing
```

## Progress Display

### RGRC Cycle Progress Visualization

Display TDD cycle progress with real-time updates:

```markdown
📋 Implementation Task: User Authentication Feature
🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit

Current Cycle: Scenario 2/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Red Phase    [████████████] Complete
🟢 Green Phase  [████████░░░░] 70%
🔵 Refactor     [░░░░░░░░░░░░] Waiting
✅ Commit       [░░░░░░░░░░░░] Waiting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: Minimal implementation until test passes...
Elapsed: 8 min | Remaining scenarios: 3
```

### Quality Check Progress

Parallel quality checks during implementation:

```markdown
Quality checks in progress:
├─ 🧪 Tests      [████████████] ✅ 45/45 passing
├─ 📊 Coverage   [████████░░░░] ⚠️ 78% (Target: 80%)
├─ 🔍 Lint       [████████████] ✅ 0 errors, 2 warnings
├─ 🔷 TypeCheck  [████████████] ✅ All types valid
└─ 🎨 Format     [████████████] ✅ Formatted

Quality Score: 92% | Confidence: HIGH
```

### Implementation Mode Indicators

#### TDD Mode (Default)

```markdown
📋 TDD Progress:
Cycle 3/8: Green Phase
⏳ Current test: should handle edge cases
📝 Lines written: 125 | Tests: 18/20
```

#### Quick Implementation Mode

```markdown
⚡ Quick implementation... [████████░░] 80%
Skipping some quality checks for speed
```

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

### 6. Dynamic Quality Checks

#### Automatic Discovery

```bash
!`cat package.json 2>/dev/null || echo "(no package.json found)"`
```

#### Parallel Execution

```markdown
## Quality Check Results
### Linting (Confidence: 0.95)

      ```bash
      npm run lint | tail -5
      ```

- Status: ✅ Passing
- Issues: 0 errors, 2 warnings
- Time: 1.2s

### Type Checking (Confidence: 0.98)

      ```bash
      npm run type-check | tail -5
      ```

- Status: ✅ All types valid
- Files checked: 47
- Time: 3.4s

### Tests (Confidence: 0.92)

      ```bash
      npm test -- --passWithNoTests | grep -E "Tests:|Snapshots:"
      ```

- Status: ✅ 45/45 passing
- Coverage: 82%
- Time: 8.7s

### Format Check (Confidence: 0.90)

      ```bash
      npm run format:check | tail -3
      ```

- Status: ⚠️ 3 files need formatting
- Auto-fixable: Yes
- Time: 0.8s

```

#### Quality Score Calculation

```text
Overall Quality Score: (L*0.3 + T*0.3 + Test*0.3 + F*0.1) = 0.93
Confidence Level: HIGH - Ready for commit
```

### 7. Functionality Verification

- Verify on development server
- Validate edge cases
- Check performance

## Advanced Features

### Real-time Test Monitoring

Watch test results during development:

```bash
npm test -- --watch --coverage
```

### Code Complexity Analysis

Track complexity during implementation:

```bash
npx complexity-report src/ | grep -E "Complexity|Maintainability"
```

### Performance Profiling

For performance-critical code:

```bash
npm run profile
```

### Security Scanning

Automatic vulnerability detection:

```bash
npm audit --production | grep -E "found|Severity"
```

## Implementation Patterns

### Pattern Selection by Confidence

```markdown
## Available Patterns (Choose based on context)

### High Confidence Patterns (>0.9)
1. **Factory Pattern** - Object creation
   - When: Multiple similar objects
   - Confidence: 0.95
   - Example in: src/factories/

2. **Repository Pattern** - Data access
   - When: Database operations
   - Confidence: 0.92
   - Example in: src/repositories/

### Medium Confidence Patterns (0.7-0.9)
1. **Observer Pattern** - Event handling
   - When: Loose coupling needed
   - Confidence: 0.85
   - Consider: Built-in EventEmitter

### Experimental Patterns (<0.7)
1. **New architectural pattern**
   - Confidence: 0.6
   - Recommendation: Prototype first
```

## Risk Mitigation

### Common Implementation Risks

| Risk | Probability | Impact | Mitigation | Confidence |
|------|------------|--------|------------|------------|
| Breaking existing tests | Medium | High | Run full suite before/after | 0.95 |
| Performance regression | Low | High | Profile critical paths | 0.88 |
| Security vulnerability | Low | Critical | Security scan + review | 0.92 |
| Inconsistent patterns | Medium | Medium | Follow existing examples | 0.90 |
| Missing edge cases | High | Medium | Comprehensive test cases | 0.85 |

## Definition of Done with Confidence Metrics

Implementation complete when all metrics achieved:

```markdown
## Completion Checklist
### Core Implementation
- ✅ All RGRC cycles complete [C: 0.95]
- ✅ Feature works as specified [C: 0.93]
- ✅ Edge cases handled [C: 0.88]

### Quality Metrics
- ✅ All tests passing (47/47) [C: 1.0]
- ✅ Coverage ≥ 80% (current: 82%) [C: 0.95]
- ✅ Zero lint errors [C: 0.98]
- ✅ Zero type errors [C: 1.0]
- ⚠️ 2 lint warnings (documented) [C: 0.85]

### Code Quality
- ✅ SOLID principles applied [C: 0.90]
- ✅ DRY - No duplication [C: 0.92]
- ✅ Readable code standards [C: 0.88]
- ✅ Consistent with codebase [C: 0.94]

### Documentation
- ✅ Code comments where needed [C: 0.85]
- ✅ README updated if required [C: 0.90]
- ✅ API docs current [C: 0.87]

### Overall Confidence: 0.92 (HIGH)
Status: ✅ READY FOR REVIEW
```

If confidence < 0.8 on any critical metric, continue improving.

## Decision Framework

### When Implementation Confidence is Low

```markdown
## Low Confidence Detected (< 0.7)
### Issue: [Uncertain about implementation approach]

Options:
1. **Research More** (/research)
   - Time: +30 min
   - Confidence gain: +0.3

2. **Prototype First**
   - Time: +15 min
   - Confidence gain: +0.2

3. **Consult Documentation**
   - Time: +10 min
   - Confidence gain: +0.15

Recommendation: Option 1 for complex features
```

### Quality Gate Failures

```markdown
## Quality Gate Failed
### Issue: Coverage dropped below 80%

Current: 78% (-2% from main)
Uncovered lines: src/auth/validator.ts:45-52

Actions:
1. ❌ Add tests for uncovered lines
2. ⏳ Or document why not testable
3. ⏳ Or adjust threshold (not recommended)

Proceeding without resolution? (y/N)
```

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
