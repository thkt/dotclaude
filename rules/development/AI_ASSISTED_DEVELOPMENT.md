---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  AI generates, humans validate. Never skip review.
  Past examples beat abstract instructions.
  You own the code, not the AI.
decision_question: "Have I reviewed and understood this AI-generated code?"
---

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

**Test Generation**: Find existing tests (grep) → Prompt with examples → Review assertions, mocks, coverage

**Code Review Checklist**: Business rules correct? Edge cases covered? Error handling appropriate? Follows standards?

## Integration with Development Principles

| Principle | AI Role | Human Role | Key Insight |
| --- | --- | --- | --- |
| **TDD/Baby Steps** [@./TDD_RGRC.md] | Generate test scaffolding | Write assertions from requirements | Baby steps still apply - one test at a time |
| **Occam's Razor** [@../reference/OCCAMS_RAZOR.md] | Generates solutions | Applies simplicity filter | AI tends to over-engineer - question every abstraction |
| **Progressive Enhancement** [@./PROGRESSIVE_ENHANCEMENT.md] | Generate simple version | Enhance based on real needs | Don't implement "future-proof" suggestions |
| **Readable Code** [@./READABLE_CODE.md] | May generate clever code | Ensures readability | Refactor for clarity over cleverness |

## Warning Signs

| Warning Type | Signs |
| --- | --- |
| **Over-Reliance** | Accepting without review, not understanding code, skipping testing, treating as infallible |
| **Under-Utilizing** | Writing all boilerplate manually, not exploring with AI, ignoring suggestions, insufficient context |

## Best Practices

| Practice | How | When |
| --- | --- | --- |
| **Rich Context** | Provide: task details, existing patterns (link/paste), business rules, edge cases, testing framework, constraints | Every AI request - specificity = quality |
| **Iterative Refinement** | Generate → Review → Refine prompt → Regenerate → Repeat | When initial output needs improvement |
| **Learn from Outputs** | Good code: analyze why, note prompt, reuse pattern<br>Poor code: identify prompt gap, note for future, improve technique | After every AI interaction |

## Guardrails

| Category | Rules |
| --- | --- |
| **Prohibit** | Committing without review, security-critical without expert review, blindly accepting architecture, skipping tests |
| **Require** | Human review always, test AI code, understand before use, document AI assistance |

## Remember

> "The best AI-assisted development combines AI's speed with human wisdom."

Key takeaways:

- **AI accelerates**, humans ensure quality
- **Past examples** beat abstract instructions
- **Review is mandatory**, not optional
- **You own the code**, not the AI

AI is your assistant, not your replacement. Use it wisely.

## Related Principles

See: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
