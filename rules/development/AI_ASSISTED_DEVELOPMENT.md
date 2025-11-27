# AI-Assisted Development

**Default mindset**: AI as a productivity tool, human as the decision maker

## Core Philosophy

**"AI generates, humans validate"** - Inspired by research on AI-assisted test case generation

AI tools are powerful assistants, but they cannot replace human judgment, domain knowledge, and code review. The goal is to leverage AI for productivity while maintaining quality through human oversight.

## Key Principles

### 1. AI is a Tool, Not a Replacement

```markdown
Human Role:
- ✅ Make final decisions
- ✅ Review and refine AI output
- ✅ Understand the "why" behind code
- ✅ Ensure business logic correctness

AI Role:
- ✅ Generate boilerplate code
- ✅ Suggest implementations
- ✅ Create test scaffolding
- ✅ Identify patterns
```

**Remember**: AI doesn't understand your business context - you do.

### 2. Quality = Prompt Quality

Based on research findings, AI output quality heavily depends on instruction quality:

```typescript
// ❌ Vague prompt
"Create a user service"

// ✅ Specific prompt with context
"Create a user service following our existing pattern in UserRepository.
- Use dependency injection for database
- Follow AAA test pattern
- Reference existing tests in tests/services/ for style"
```

**Key insight**: The more specific your instructions, the better the output.

### 3. Past Performance > Abstract Rules

**Most effective approach**: Reference existing code as examples

```bash
# Before asking AI to generate code:
1. Find similar existing implementations
2. Share them as examples in your prompt
3. Ask AI to follow the same pattern
```

**Why it works**:

- Concrete examples > theoretical guidelines
- Ensures consistency with codebase
- Reduces need for extensive revision

**Research basis**: Studies show that using past performance as reference produces the most practical and immediately usable AI-generated code.

### 4. Human Review is Non-Negotiable

```markdown
AI-Generated Code Workflow:

1. AI generates code
2. ✅ Human reviews for:
   - Business logic correctness
   - Edge case handling
   - Security implications
   - Performance considerations
3. Human refines and approves
4. Code goes to production

Never skip step 2-3.
```

**Critical point**: AI-generated code is a draft, not a final product.

## Practical Application

### Test Generation

```bash
# Effective AI-assisted test creation:

1. Find existing tests in same module
   grep -r "describe" tests/[module]/

2. Prompt AI with examples:
   "Generate tests for calculateDiscount() following this pattern:
   [paste example test from existing codebase]

   Test cases from plan:
   - Valid discount calculation
   - Edge case: zero purchases"

3. Review generated tests:
   - Verify assertions match business logic
   - Check mock setup follows project style
   - Ensure no over-testing
```

### Code Implementation

```typescript
// ❌ Don't blindly accept AI suggestions
// AI generates:
function processOrder(order) {
  // ... complex implementation
}

// ✅ Review and refine
// You verify:
// - Does this handle our specific business rules?
// - Are edge cases covered?
// - Is error handling appropriate?
// - Does it follow our coding standards?
```

## Integration with Development Principles

### With TDD/Baby Steps

[@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md)

- AI can generate test scaffolding
- Human writes assertions based on actual requirements
- Baby steps still apply - one test at a time

### With Occam's Razor

[@~/.claude/rules/reference/OCCAMS_RAZOR.md](~/.claude/rules/reference/OCCAMS_RAZOR.md)

- AI tends to over-engineer
- Human applies simplicity principle
- Question every abstraction AI suggests

### With Progressive Enhancement

[@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md)

- Start with AI-generated simple version
- Enhance based on real needs
- Don't implement AI's "future-proof" suggestions

### With Readable Code

[@~/.claude/rules/development/READABLE_CODE.md](~/.claude/rules/development/READABLE_CODE.md)

- AI-generated code may be clever but unclear
- Human ensures readability
- Refactor for clarity over cleverness

## Warning Signs

### Over-Reliance on AI

- ❌ Accepting AI output without review
- ❌ Not understanding generated code
- ❌ Skipping manual testing
- ❌ Treating AI as infallible

### Under-Utilizing AI

- ❌ Writing all boilerplate manually
- ❌ Not using AI for exploration
- ❌ Ignoring AI suggestions entirely
- ❌ Not providing sufficient context to AI

## Best Practices

### 1. Provide Rich Context

```markdown
Good AI Prompt Template:

"Task: [Specific task]

Context:
- Existing pattern: [Link or paste example]
- Business rules: [Specific requirements]
- Edge cases: [Known scenarios]
- Testing framework: [Jest/Vitest/etc]

Constraints:
- Follow [specific pattern]
- Maximum complexity: [simple/moderate]
- Must handle: [specific cases]"
```

### 2. Iterative Refinement

```bash
1. Generate initial version
2. Review and identify issues
3. Refine prompt with specific feedback
4. Generate improved version
5. Repeat until satisfactory
```

### 3. Learn from Outputs

```typescript
// When AI generates good code:
- ✅ Analyze why it worked
- ✅ Note the prompt that produced it
- ✅ Reuse successful patterns

// When AI generates poor code:
- ✅ Identify what was missing in prompt
- ✅ Note the gap for future reference
- ✅ Improve prompt engineering
```

## Guardrails

**STRICTLY PROHIBIT**:

- Committing AI code without review
- Using AI for security-critical code without expert review
- Blindly accepting AI's architectural decisions
- Skipping tests for AI-generated code

**EXPLICITLY REQUIRE**:

- Human review of all AI output
- Testing AI-generated code
- Understanding generated code before use
- Documenting AI-assisted parts

## Remember

> "The best AI-assisted development combines AI's speed with human wisdom."

Key takeaways:

- **AI accelerates**, humans ensure quality
- **Past examples** beat abstract instructions
- **Review is mandatory**, not optional
- **You own the code**, not the AI

AI is your assistant, not your replacement. Use it wisely.

## Related Principles

### Core Practices

- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - AI can help with test scaffolding, humans ensure correctness
- [@~/.claude/rules/development/READABLE_CODE.md](~/.claude/rules/development/READABLE_CODE.md) - Refine AI output for clarity
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - Start simple with AI, enhance manually

### Quality Principles

- [@~/.claude/rules/reference/OCCAMS_RAZOR.md](~/.claude/rules/reference/OCCAMS_RAZOR.md) - Simplify AI's complex suggestions
- [@~/.claude/rules/reference/DRY.md](~/.claude/rules/reference/DRY.md) - AI can identify duplication, humans decide abstractions
- [@~/.claude/rules/reference/SOLID.md](~/.claude/rules/reference/SOLID.md) - Human judgment on architectural patterns
