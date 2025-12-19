# Evaluations for creating-adrs

## Selection Criteria

Keywords and contexts that should trigger this skill:

- Keywords: ADR, Architecture Decision, Architecture Decision Record, technology selection, design decision, decision record
- Contexts: Architecture decisions, technology selection, design documentation

## Evaluation Scenarios (JSON Format - Anthropic Official Best Practices)

### Scenario 1: Basic ADR Creation

```json
{
  "skills": ["creating-adrs"],
  "query": "I want to document the decision to adopt React as an ADR",
  "files": [],
  "expected_behavior": [
    "creating-adrs skill is triggered",
    "MADR format template is provided",
    "Status, Context, Decision, Consequences sections are included"
  ]
}
```

### Scenario 2: ADR with Alternatives

```json
{
  "skills": ["creating-adrs"],
  "query": "I want to create an ADR for database selection. I compared PostgreSQL and MongoDB",
  "files": [],
  "expected_behavior": [
    "Both options are listed in Considered Options section",
    "Pros/Cons for each option are organized",
    "Final decision rationale is clearly shown"
  ]
}
```

### Scenario 3: ADR Update

```json
{
  "skills": ["creating-adrs"],
  "query": "I want to update an existing ADR and change its status",
  "files": [],
  "expected_behavior": [
    "ADR update best practices are explained",
    "Status change methods (Superseded/Deprecated) are shown",
    "Methods for linking to related ADRs are provided"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] MADR format followed
- [ ] All required sections included
