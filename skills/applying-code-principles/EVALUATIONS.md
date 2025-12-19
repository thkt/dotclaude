# Evaluations for applying-code-principles

## Selection Criteria

Keywords and contexts that should trigger this skill:

- Keywords: SOLID, DRY, YAGNI, Occam's Razor, KISS, principles, simple, design, architecture, refactoring
- Contexts: Architecture discussion, code review, refactoring, design decisions

## Evaluation Scenarios (JSON Format - Anthropic Official Best Practices)

### Scenario 1: Basic Principle Application

```json
{
  "skills": ["applying-code-principles"],
  "query": "I want to refactor this code",
  "files": [],
  "expected_behavior": [
    "applying-code-principles skill is triggered",
    "SOLID principles are referenced",
    "Specific improvement suggestions are provided"
  ]
}
```

### Scenario 2: Decision Making

```json
{
  "skills": ["applying-code-principles"],
  "query": "Should I abstract this?",
  "files": [],
  "expected_behavior": [
    "YAGNI/Occam's Razor is referenced",
    "Criteria for 'Is it needed now?' are presented",
    "Concrete judgment is provided"
  ]
}
```

### Scenario 3: Conflict Resolution

```json
{
  "skills": ["applying-code-principles"],
  "query": "DRY and Readability are conflicting",
  "files": [],
  "expected_behavior": [
    "Priority of principles is explained",
    "Context-appropriate judgment is shown",
    "Specific code examples are provided"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] Appropriate principles referenced
- [ ] Output quality meets standards
