# TDD/RGRC Cycle Implementation Details

This module provides detailed TDD implementation guidance with Baby Steps methodology.

## 1. Test-Driven Development (TDD) as t_wada would

**Goal**: "Clean code that works" - Ron Jeffries

### Baby Steps - The Foundation of TDD

**Core Principle**: Make the smallest possible change at each step

#### Why Baby Steps Matter

- **Immediate error localization**: When test fails, the cause is in the last tiny change
- **Continuous working state**: Code is always seconds away from green
- **Rapid feedback**: Each step takes 1-2 minutes max
- **Confidence building**: Small successes compound into major features

#### Baby Steps in Practice

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

#### Baby Steps Rhythm

1. **Write smallest failing test** (30 seconds)
2. **Make it pass with minimal code** (1 minute)
3. **Run tests** (10 seconds)
4. **Tiny refactor if needed** (30 seconds)
5. **Commit if green** (20 seconds)

Total cycle: ~2 minutes

### Test Generation from Plan (Pre-Red)

Before entering the RGRC cycle, automatically generate tests from SOW:

```bash
# 1. Check for SOW with test plan
.claude/workspace/planning/[feature-name]/sow.md

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

### Enhanced RGRC Cycle with Real-time Feedback

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

## TodoWrite Integration

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
