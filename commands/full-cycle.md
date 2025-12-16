---
description: >
  Orchestrate complete development cycle through SlashCommand tool integration, executing from research through implementation, testing, and validation.
  Chains multiple commands: /research → /think → /code → /test → /audit → /validate with conditional execution and error handling.
  TodoWrite integration for progress tracking. Use for comprehensive feature development requiring full workflow automation.
allowed-tools: SlashCommand, TodoWrite, Read, Write, Edit, MultiEdit
model: inherit
argument-hint: "[feature or task description]"
---

# /full-cycle - Complete Development Cycle Automation

## Purpose

Systematically orchestrate the complete development cycle through SlashCommand tool integration, rigorously executing from research through implementation, testing, and validation phases.

## Workflow Instructions

Follow this command sequence when invoked. Use the **SlashCommand tool** to execute each command:

### Phase 1: Research

**Use SlashCommand tool to execute**: `/research [task description]`

- Explore codebase structure and understand existing implementation
- Document findings for context
- On failure: Terminate workflow and report to user

### Phase 2: Planning

**Use SlashCommand tool to execute**: `/think [feature description]`

- Create comprehensive SOW with acceptance criteria
- Define implementation approach and risks
- On failure: May retry once or ask user for clarification

### Phase 2.5: Design Review

**Use Task tool to invoke**: `sow-spec-reviewer` agent

- Review generated sow.md and spec.md
- Apply 100-point scoring with 90-point pass threshold
- Check SOW ↔ Spec consistency
- On PASS (≥90): Proceed to Phase 3
- On CONDITIONAL (70-89): Fix issues and re-review
- On FAIL (<70): Return to Phase 2 with clarifications

```typescript
Task({
  subagent_type: "sow-spec-reviewer",
  description: "Design document review",
  prompt: `
    Review the SOW and Spec documents.
    Apply 100-point scoring (90-point pass threshold).
    Check SOW ↔ Spec consistency.
    Report results in Japanese.
  `
})
```

### Phase 3: Implementation

**Use SlashCommand tool to execute**: `/code [implementation details]`

- Implement following TDD/RGRC cycle
- Apply SOLID principles and code quality standards
- On failure: **Use SlashCommand tool to execute `/fix`** and retry

### Phase 4: Testing

**Use SlashCommand tool to execute**: `/test`

- Run all tests (unit, integration, E2E)
- Verify quality standards
- On failure: **Use SlashCommand tool to execute `/fix`** and re-test

### Phase 5: Review

**Use SlashCommand tool to execute**: `/audit`

- Multi-agent code review for quality, security, performance
- Generate actionable recommendations
- On failure: Document issues for manual review

### Phase 6: Validation

**Use SlashCommand tool to execute**: `/validate`

- Verify implementation against SOW criteria
- Check coverage and performance metrics
- On failure: Report missing requirements

## Progress Tracking

Use **TodoWrite** tool throughout to track progress:

```markdown
Development Cycle Progress:
- [ ] Research phase (Use SlashCommand: /research)
- [ ] Planning phase (Use SlashCommand: /think)
- [ ] Design review phase (Use Task: sow-spec-reviewer)
- [ ] Implementation phase (Use SlashCommand: /code)
- [ ] Testing phase (Use SlashCommand: /test)
- [ ] Review phase (Use SlashCommand: /audit)
- [ ] Validation phase (Use SlashCommand: /validate)
```

Update each task status as commands complete.

## Error Handling Strategy

When a command fails:

1. **For /code or /test failures**: Automatically use SlashCommand to invoke `/fix`
2. **For /research or /think failures**: Ask user for clarification
3. **For design review failures**:
   - CONDITIONAL (70-89): Show issues, fix SOW/Spec, re-review
   - FAIL (<70): Return to `/think` with user clarifications
4. **For /audit failures**: Continue with documented issues
5. **For /validate failures**: Report specific criteria that failed

## Conditional Execution

After each phase, evaluate results:

- If test coverage < 80%: Consider additional test implementation
- If critical security issues found: Prioritize fixes before proceeding
- If performance issues detected: May need optimization pass

## Example Execution

```markdown
User: /full-cycle "Add user authentication feature"

Claude: Starting full development cycle...

[Uses SlashCommand to execute: /research user authentication]
✓ Research complete - found existing auth patterns

[Uses SlashCommand to execute: /think Add OAuth2 authentication]
✓ SOW created with 8 acceptance criteria
✓ Spec created with detailed requirements

[Uses Task to invoke: sow-spec-reviewer]
📋 Design Review Score: 92/100 ✅ PASS
- Accuracy: 23/25 ✓
- Completeness: 24/25 ✓
- Relevance: 22/25 ✓
- Actionability: 23/25 ✓
✓ Proceeding to implementation

[Uses SlashCommand to execute: /code Implement OAuth2 login flow]
✓ Implementation complete - 15 files modified

[Uses SlashCommand to execute: /test]
⚠ 3 tests failed

[Uses SlashCommand to execute: /fix]
✓ Fixes applied

[Uses SlashCommand to execute: /test]
✓ All tests passing

[Uses SlashCommand to execute: /audit]
✓ Review complete - 2 medium priority issues found

[Uses SlashCommand to execute: /validate]
✓ All acceptance criteria met

Complete! Feature successfully implemented and validated.
```

## Usage Specifications

```bash
# Standard execution
/full-cycle

# Selectively skip phases
/full-cycle --skip=research,think

# Initiate from specific phase
/full-cycle --start-from=code

# Dry-run mode (display plan without execution)
/full-cycle --dry-run
```

## Integration Benefits

1. **🔄 Complete Automation**: Minimizes manual intervention throughout workflow
2. **📊 Progress Visibility**: Seamlessly integrates with TodoWrite for transparent tracking
3. **🛡️ Error Resilience**: Intelligent retry mechanisms with automatic corrections
4. **⚡ Optimized Execution**: Ensures optimal command sequence and timing

## Configuration Specification

Customize behavior through settings.json:

```json
{
  "full_cycle": {
    "default_sequence": ["research", "think", "code", "test", "review"],
    "error_handling": "stop_on_failure",
    "parallel_execution": true,
    "auto_commit": false
  }
}
```

## Critical Requirements

- Strictly requires SlashCommand tool (v1.0.123+)
- Execution permissions must be explicitly configured for each command
- Automatic corrections utilize `/fix` only when available
- Comprehensive summary report generated upon completion
