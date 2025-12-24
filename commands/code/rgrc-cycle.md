# TDD/RGRC Cycle Implementation Details

This module provides detailed TDD implementation guidance for feature development with spec-driven approach.

## TDD Fundamentals Reference

For core TDD principles, Baby Steps, and RGRC cycle basics:

- [@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md) - TDD philosophy and principles
- [@~/.claude/skills/tdd-fundamentals/examples/feature-driven.md](~/.claude/skills/tdd-fundamentals/examples/feature-driven.md) - Feature-driven TDD pattern
- [@~/.claude/commands/shared/tdd-cycle.md](~/.claude/commands/shared/tdd-cycle.md) - RGRC implementation details

## Feature-Driven TDD Context

This module focuses on **spec-driven feature development** with interactive test activation.

**Key Characteristics**:

- Tests generated from spec.md (Phase 0)
- All tests start in skip state
- User activates one test at a time
- Full RGRC cycle for each test

**See also**: [@./test-preparation.md](./test-preparation.md) for Phase 0 details

### Test Generation from Plan (Pre-Red)

Before entering the RGRC cycle, automatically generate tests from spec.md.

**For detailed test generation patterns**:
[@~/.claude/commands/shared/test-generation.md](~/.claude/commands/shared/test-generation.md)

**Spec-driven generation** (Phase 0):
See [@./test-preparation.md](./test-preparation.md) for interactive test activation workflow.

**Quick reference**:

```bash
# 1. Check for spec with test scenarios
.claude/workspace/planning/[feature-name]/spec.md

# 2. Generate tests in skip mode (Phase 0)
# See test-preparation.md for details

# 3. Activate one test at a time (interactive)
```

**When to generate:**

- spec.md contains FR-xxx requirements or Given-When-Then scenarios
- No existing tests for planned features
- User requests test generation

**Skip conditions:**

- Tests already exist
- No spec.md defined
- Quick fix mode (use `/fix` instead)

### Enhanced RGRC Cycle with Real-time Feedback

For detailed phase guidance, see:
[@~/.claude/commands/shared/tdd-cycle.md](~/.claude/commands/shared/tdd-cycle.md)

**Feature-specific adaptations**:

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
