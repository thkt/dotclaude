# Agent Model Selection Guide

## Selection Criteria

| Condition | Model | Cost | Speed |
|-----------|-------|------|-------|
| Multi-agent coordination | opus | High | Slow |
| Deep context understanding | sonnet | Medium | Medium |
| Pattern-based processing | haiku | Low | Fast |

## Decision Tree

```text
Does the task require coordinating multiple agents?
  YES → opus
  NO ↓
Does the task require deep context understanding?
  YES → sonnet
  NO ↓
Is the task pattern-based or routine?
  YES → haiku
  NO → sonnet (default)
```

## Current Agent Configuration

### Reviewers (primarily sonnet)

- performance-reviewer: sonnet - Complex optimization analysis
- accessibility-reviewer: sonnet - WCAG compliance checking
- readability-reviewer: haiku - Pattern-based checking
- type-safety-reviewer: sonnet - Type inference required

### Generators (primarily haiku)

- commit-generator: haiku - Routine message generation
- branch-generator: haiku - Naming convention based
- test-generator: sonnet - Code understanding required

### Orchestrators (opus)

- review-orchestrator: opus - Multi-reviewer coordination

## Cost Estimates

Per 1000 tokens:

- haiku: ~$0.00025
- sonnet: ~$0.003
- opus: ~$0.015

## Decision Flow for New Agents

1. Evaluate task complexity
2. Assess context understanding needs
3. Follow the Decision Tree above
4. Reference similar existing agents for adjustments

## Related Documents

- [agents/README.md](./README.md) - Directory structure and creation guide
- [Skills README](../skills/README.md) - Integration with skills
