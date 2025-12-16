# Golden Masters - Quality Standards Reference

## Purpose

Accumulate ideal artifacts for prompt tuning and output verification standards.

> Golden Master approach: Humans create ideal artifacts first, then compare with command output to tune prompts

## Directory Structure

```text
golden-masters/
├── README.md             # This file
├── documents/            # Document quality standards
│   ├── sow/              # Ideal SOW examples
│   │   └── example-*.md
│   └── spec/             # Ideal Spec examples
│       └── example-*.md
├── outputs/              # Command output verification
│   ├── README.md         # Output verification guide
│   ├── fix-output.md     # /fix output format
│   ├── think-sow.md      # /think SOW output
│   └── code-output.md    # /code output format
└── ja/                   # Japanese version
    └── ...
```

## Two Use Cases

### 1. documents/ - Document Quality Standards

Reference examples for scoring SOW/Spec quality and improving prompts.

**Use cases**:

- When generating documents with `/think` or `/sow` + `/spec`
- Improving after scoring with `sow-spec-reviewer`
- Prompt tuning

Details: [documents/README.md](documents/README.md) (TBD)

### 2. outputs/ - Command Output Verification

Define expected output formats for each command, used for regression testing.

**Use cases**:

- Verifying output format after command modifications
- Format reference when creating new commands
- Automated verification in CI/CD

Details: [outputs/README.md](outputs/README.md)

## Quality Standards

### SOW Evaluation Criteria (100 points)

| Aspect | Points | Evaluation Items |
|--------|--------|------------------|
| Structure | 25 | Coverage of required sections |
| Clarity | 25 | Proper use of ✓/→/? markers |
| Actionability | 25 | Concrete Acceptance Criteria |
| Risk Assessment | 25 | Realistic risk identification and mitigation |

### Spec Evaluation Criteria (100 points)

| Aspect | Points | Evaluation Items |
|--------|--------|------------------|
| Implementability | 25 | Directly convertible to code |
| Testability | 25 | Given-When-Then format |
| SOW Alignment | 25 | 1:1 correspondence between AC and FR |
| Completeness | 25 | Coverage of NFR, migration guide |

### Pass Criteria

| Score | Verdict | Action |
|-------|---------|--------|
| 90+ | ✅ PASS | Proceed to implementation phase |
| 70-89 | ⚠️ CONDITIONAL | Fix issues and re-review |
| Below 70 | ❌ FAIL | Major revision required |

## Included Examples

### documents/sow/

| File | Features | Score |
|------|----------|-------|
| `example-workflow-improvement.md` | Phase division, incremental improvement | 95 |
| `example-storybook-integration.md` | Frontend features, Component API | - |
| `example-config-optimization.md` | Config optimization, performance | - |

### documents/spec/

| File | Features | Score |
|------|----------|-------|
| `example-workflow-improvement.md` | Clear FR/NFR, TypeScript interface | 95 |
| `example-storybook-integration.md` | Component API, Stories definition | - |
| `example-config-optimization.md` | Config schema, migration guide | - |

## Related Documents

- [sow-spec-reviewer](../agents/reviewers/sow-spec.md)
- [SOW Template](../templates/sow.md) (TBD in Phase 4)
- [Spec Template](../templates/spec.md) (TBD in Phase 4)

## Changelog

| Date | Changes |
|------|---------|
| 2025-12-16 | Initial creation (Spec-driven development practices) |
| 2025-12-16 | Structure integration (documents/ + outputs/) |
| 2025-12-16 | English/Japanese separation |
