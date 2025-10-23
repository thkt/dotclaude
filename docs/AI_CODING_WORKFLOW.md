# AI Coding Workflow - A Practical Guide to Controlled AI Development

> "The best AI code is code you can control, understand, and trust"

## Introduction

AI coding tools have transformed software development, but without a systematic workflow, they can create more problems than they solve. This guide synthesizes insights from industry practitioners and established engineering principles to provide a practical, team-ready workflow.

### Why This Workflow Matters

**The Challenge**: AI can generate code faster than we can understand it. Without discipline, we accumulate technical debt at unprecedented speeds.

**The Solution**: A structured workflow that maximizes AI's strengths while minimizing risks through:

- **Controllability**: Minimize what AI decides autonomously
- **Quality**: Never compromise on code quality
- **Explicitness**: Make all requirements and constraints explicit

### Who This Is For

- Development teams adopting AI coding tools
- Individual developers seeking systematic AI workflows
- Engineering leads establishing AI coding standards

## The Three Pillars

### 1. Controllability - Minimize LLM Responsibility

**Principle**: The less AI decides, the more you control.

Inspired by classical software engineering, we separate concerns:

```markdown
You Control (Deterministic):
├─ Architecture decisions
├─ Task decomposition
├─ Success criteria
├─ Security policies
└─ Quality thresholds

AI Assists (Non-deterministic):
├─ Design exploration within constraints
├─ Code generation following patterns
├─ Trade-off analysis with explicit criteria
└─ Refactoring suggestions with clear goals
```

**Practical Application**:

- Use tools (MCPs, commands) for deterministic operations
- Define explicit constraints before AI generates code
- Separate planning (you) from implementation (AI)

### 2. Quality - The 100% Review Standard

**Principle**: "If even 1% feels wrong, discard it entirely"

This zero-tolerance approach prevents technical debt accumulation:

**The Review Mindset**:

```markdown
✅ Acceptable:
- Code you fully understand
- Patterns that match your standards
- Solutions aligned with requirements

❌ Unacceptable:
- "Good enough" code you don't fully grasp
- Clever solutions without clear justification
- Any deviation from explicit requirements
```

**Abandonment Criteria**:

- Same error occurs 5 times → Change approach
- Understanding remains below 95% → Get clarification
- Complexity increases with each fix → Restart with simpler design

### 3. Explicitness - Language Creates Design

**Principle**: "Requirements articulated in language naturally produce good design"

The act of explicitly stating what you want forces clarity:

**The Articulation Process**:

1. **Decompose**: Break vague requests into specific requirements
2. **Define Boundaries**: State what's in/out of scope
3. **Set Success Criteria**: Define measurable completion conditions

**Example**:

```markdown
❌ Vague: "Add user authentication"

✅ Explicit:
- Requirements:
  * Email/password authentication
  * JWT tokens with 24h expiry
  * Password must meet: 8+ chars, 1 uppercase, 1 number
  * Max 5 login attempts before 15min lockout

- Boundaries:
  * In scope: Registration, login, logout, password reset
  * Out of scope: OAuth, 2FA, social login

- Success Criteria:
  * All tests pass (unit + integration)
  * Security audit shows no critical vulnerabilities
  * Login flow completes in <500ms
```

This articulation naturally produces SOLID design without consciously applying the principles.

## Phase-by-Phase Workflow

### Phase 1: Planning - Explicit Requirements

**Goal**: 95%+ understanding before any code

**Steps**:

1. **Write User-Facing Requirements**

   ```markdown
   As a [user type], I want [goal] so that [benefit]
   ```

2. **Decompose into Technical Tasks**
   - Break down into single-responsibility units
   - Each task should be testable independently
   - Estimate 1-4 hours per task max

3. **Define Acceptance Criteria**

   ```markdown
   Done when:
   - [ ] Feature works as specified
   - [ ] All tests pass (>80% coverage)
   - [ ] No linter errors
   - [ ] Performance meets SLA
   - [ ] Security review passed
   ```

4. **Set Explicit Constraints**

   ```markdown
   Must:
   - Use existing authentication framework
   - Follow repository's error handling pattern
   - No new dependencies without approval

   Must Not:
   - Use implicit fallbacks
   - Add optional parameters without justification
   - Implement ad-hoc solutions
   ```

**Tools**:

- `/think` command for structured planning
- TodoWrite for task tracking
- SOW documents for complex features

### Phase 2: Implementation - Controlled Generation

**Goal**: Generate only code you fully understand

**The RGRC Cycle** (Red-Green-Refactor-Commit):

```markdown
1. Red: Write failing test
   ├─ Verify it fails for the right reason
   └─ Test must be specific and focused

2. Green: Minimal implementation
   ├─ Just enough to pass the test
   ├─ AI can generate, you must understand
   └─ Question anything unclear

3. Refactor: Improve without changing behavior
   ├─ Remove duplication
   ├─ Apply patterns explicitly
   └─ Keep tests green

4. Commit: Save progress
   └─ Atomic commits per completed cycle
```

**Implementation Rules**:

```markdown
Strict Enforcement:
1. No implicit fallbacks - all error handling explicit
2. No optional parameters without documented justification
3. No ad-hoc fixes - always address root cause
4. No behavior changes during refactoring
```

**AI Interaction Pattern**:

```typescript
// ❌ Vague request
"Add error handling"

// ✅ Explicit instruction
"Add error handling that:
1. Catches NetworkError and returns { success: false, error: 'network' }
2. Catches ValidationError and returns { success: false, error: 'validation', details }
3. Re-throws all other errors
4. Logs all errors to errorLogger with request context
No implicit fallbacks, no default cases"
```

**Verification Checkpoints**:

- After each AI response: "Do I understand this 100%?"
- Before accepting code: "Does this match my explicit requirements?"
- During review: "Would I write this myself?"

**Tools**:

- `/code` command for TDD implementation
- `/fix` for small, well-understood changes
- Confidence markers (✓/→/?) for verification

### Phase 3: Testing - Comprehensive Verification

**Goal**: Prove the code works and fails gracefully

**Test Design Approach**:

1. **Equivalence Partitioning**

   ```markdown
   For age validation (18-120):
   - Invalid: <18
   - Valid: 18-120
   - Invalid: >120
   ```

2. **Boundary Value Analysis**

   ```markdown
   Test: [min-1, min, max, max+1]
   Values: [17, 18, 120, 121]
   ```

3. **Decision Table Testing** (for complex logic)

   ```markdown
   | Condition A | Condition B | Result |
   |-------------|-------------|--------|
   | true        | true        | X      |
   | true        | false       | Y      |
   | false       | true        | Z      |
   | false       | false       | W      |
   ```

**Coverage Targets**:

- Statement coverage (C0): 80% minimum
- Branch coverage (C1): 70% minimum
- Focus coverage on critical paths, not metrics

**Test Execution**:

```bash
# Discover and run tests
npm test  # or yarn test, flutter test, etc.

# Verify all checks pass
✓ Tests pass (exit code 0)
✓ Linter passes (0 errors)
✓ Build succeeds
✓ Manual smoke test for critical paths
```

**Failure Response**:

```markdown
If tests fail:
1. Fix immediately - do not proceed
2. Max 5 retry attempts with same approach
3. After 5 failures: change approach entirely

If linter fails:
1. Fix all errors immediately
2. Address warnings if <5 total
3. Never suppress without documented justification
```

**Tools**:

- `/test` command for comprehensive testing
- Test discovery from package.json/README
- Automatic retry with exponential backoff

### Phase 4: Review - The 100% Standard

**Goal**: Only ship code you'd proudly show your best engineer

**The Three-Level Review**:

**Level 1: Self-Review**

```markdown
Questions to ask:
- [ ] Do I understand every line?
- [ ] Is there any "clever" code I need to explain?
- [ ] Are all edge cases handled explicitly?
- [ ] Would I write this myself?
- [ ] Is this the simplest solution?
```

**Level 2: Principle Review**

```markdown
SOLID Principles:
- [ ] Single Responsibility: Each class/function does one thing
- [ ] Open-Closed: Extended through composition, not modification
- [ ] Liskov Substitution: Subtypes work everywhere base types do
- [ ] Interface Segregation: No unused dependencies
- [ ] Dependency Inversion: Depend on abstractions

Readability:
- [ ] Function names describe what, not how
- [ ] No more than 5 parameters per function
- [ ] No more than 3 levels of nesting
- [ ] New developer understands in <1 minute

Simplicity (Occam's Razor):
- [ ] Fewest dependencies needed
- [ ] Lowest cyclomatic complexity
- [ ] No "just in case" features
```

**Level 3: Automated Review**

```markdown
Use `/review` command for:
- Security vulnerabilities
- Performance bottlenecks
- Accessibility issues
- Type safety problems
- Readability concerns
```

**The Discard Decision**:

When to discard and restart:

```markdown
Immediate discard if:
- Understanding <95% after clarification attempts
- Same error pattern 5+ times
- Complexity increasing, not decreasing
- "1% feels wrong" gut feeling

Probably discard if:
- Modification count >5 for simple task
- Need extensive comments to explain
- Would fail your own code review
```

## Failure Patterns and Solutions

### Pattern 1: The Accumulating Complexity

**Symptom**: Each AI modification makes code more complex

**Why it happens**: AI optimizes for passing tests, not simplicity

**Solution**:

```markdown
1. Stop immediately when complexity increases
2. Articulate desired simplicity explicitly
3. Restart with simpler constraints
4. Consider if task decomposition was wrong
```

**Example**:

```typescript
// After 3 modifications, you have:
function processUser(user, options = {}, flags = {}, context = {}) {
  // 50 lines of branching logic
}

// Discard and restart with:
"Create processUser that:
1. Takes only user and processOptions
2. processOptions contains all config (no defaults without docs)
3. Single responsibility: validate then transform
4. Max 15 lines
5. Extract sub-functions if needed"
```

### Pattern 2: The Mystery Black Box

**Symptom**: Code works but you can't explain how

**Why it happens**: Accepting AI output without full understanding

**Solution**:

```markdown
1. Ask AI to explain every unclear line
2. Request simpler alternative if explanation isn't clear
3. Discard if still unclear after 2 explanation attempts
4. Remember: You'll maintain this code at 2am
```

### Pattern 3: The Scope Creep

**Symptom**: Implementation includes features you didn't request

**Why it happens**: AI infers "helpful" additions

**Solution**:

```markdown
1. Explicit "in scope / out of scope" in every request
2. Reject any code outside explicit scope
3. Add to requirements: "Implement ONLY what's specified. No extras."
```

### Pattern 4: The Implicit Fallback

**Symptom**: Error cases have `|| defaultValue` or catch-all handlers

**Why it happens**: AI prioritizes "robustness" over explicitness

**Solution**:

```markdown
Add to requirements:
"Error handling rules:
- No implicit fallbacks (no || defaultValue)
- All error cases must be explicit
- Unknown errors must throw, never return default
- Document rationale for each error handling choice"
```

## Quick Reference - Daily Workflow

### Starting a Task

```markdown
1. Articulate requirements explicitly (95%+ understanding)
2. Define acceptance criteria
3. Set constraints (must/must not)
4. Break into <4hr tasks
5. Choose command: /think → /code OR /fix (simple changes)
```

### During Implementation

```markdown
1. Follow RGRC: Red → Green → Refactor → Commit
2. After each AI response: "Do I understand 100%?"
3. Question anything unclear immediately
4. Max 5 retry attempts before changing approach
```

### Before Accepting Code

```markdown
1. Self-review: Would I write this?
2. Principle review: SOLID, readable, simple?
3. Tests pass + linter clean + build succeeds
4. If 1% feels wrong → discard
```

### Discard Triggers

```markdown
Discard if:
- Same error 5 times
- Understanding <95% after clarification
- Complexity increasing
- "Would I show this to senior engineer?" = No
```

## Tools and Commands

### Core Development Flow

```bash
/think    # Plan with verifiable SOW
/research # Investigate without implementation
/code     # TDD/RGRC implementation
/test     # Comprehensive testing
/review   # Multi-dimensional code review
/validate # Verify against SOW
```

### Quick Actions

```bash
/fix      # Small, well-understood changes
/hotfix   # Production emergencies (minimal process)
```

### Progress Tracking

```bash
/sow      # Check implementation progress
```

## Metrics for Success

### Team-Level Indicators

```markdown
Good signs:
- Discard rate 10-20% (you're being selective)
- Average task completion <4 hours
- Code review comments decreasing
- Production bugs not increasing

Warning signs:
- Discard rate <5% (accepting too much)
- Average task >8 hours (tasks too large)
- "I don't understand this" in reviews
- Technical debt accumulating
```

### Individual Indicators

```markdown
You're succeeding when:
- You can explain any line of AI-generated code
- Modification attempts rarely exceed 3
- Tests pass on first run >60% of time
- You feel confident deploying to production

You need to adjust when:
- Frequently saying "it works but I don't know why"
- Often hitting 5-retry limit
- Spending more time fixing than implementing
- Hesitant to deploy AI-generated code
```

## Conclusion

AI coding tools are powerful accelerators, but only when properly controlled. This workflow balances speed with quality by:

1. **Minimizing AI autonomy** - You decide, AI executes within constraints
2. **Maintaining quality standards** - 100% review, zero tolerance for unclear code
3. **Explicit articulation** - Requirements stated clearly produce good design

### The Core Mindset

```markdown
Every AI interaction:
├─ Articulate explicitly
├─ Verify completely
├─ Discard ruthlessly
└─ Ship confidently
```

### Next Steps

1. **Team adoption**: Share this workflow with your team
2. **Customize**: Adapt rules to your team's context
3. **Measure**: Track discard rate, completion time, bug rate
4. **Iterate**: Refine based on what works for your team

### Related Resources

- CLAUDE.md - Core principles and rules
- PRE_TASK_CHECK.md - Understanding verification process
- AI Operation Principles - Safety and quality guidelines
- Test Generation - Systematic test design techniques

---

**Remember**: "The best code is code you can control, understand, and trust."

*Version 1.0.0 - 2025*
