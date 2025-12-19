# Evaluations Template for Skills

This template is a guide for creating quality evaluation scenarios for skills.

## Usage

1. Copy this template and save as `[skill-name]/EVALUATIONS.md`
2. Replace `[skill-name]` with the actual skill name
3. Specify concrete queries and expected behaviors for each scenario
4. Create at least 3 evaluation scenarios

---

## Template: Evaluations for [skill-name]

## Selection Criteria

Keywords and contexts that should trigger this skill:

- Keywords: [trigger keywords]
- Contexts: [usage contexts]

## Evaluation Scenarios (JSON Format - Anthropic Official Best Practices)

### Scenario 1: Basic Usage

```json
{
  "skills": ["[skill-name]"],
  "query": "[typical user request]",
  "files": [],
  "expected_behavior": [
    "Skill is triggered and loaded",
    "Correct reference files are accessed",
    "Output follows skill guidelines"
  ]
}
```

### Scenario 2: Edge Case

```json
{
  "skills": ["[skill-name]"],
  "query": "[edge case request]",
  "files": [],
  "expected_behavior": [
    "Handles edge case gracefully",
    "Provides appropriate fallback or guidance"
  ]
}
```

### Scenario 3: Error Handling

```json
{
  "skills": ["[skill-name]"],
  "query": "[problematic request]",
  "files": [],
  "expected_behavior": [
    "Provides clear error message",
    "Suggests alternatives or next steps"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] Expected behaviors were observed
- [ ] Output quality meets standards
