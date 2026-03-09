# Feature Template

## Structure

```markdown
## What & Why

[What to build — 1-2 sentences]
[Why it's needed — user problem or business reason]

## Acceptance Criteria

- [ ] [When X, then Y happens]
- [ ] [When X, then Y happens]

## Scope

- **In scope**: [What this issue covers]
- **Out of scope**: [What this issue explicitly excludes]

## Constraints (optional)

- [Technical constraints, prohibited approaches, dependencies]
```

## Guidelines

| Field               | OK                                           | NG                                         |
| ------------------- | -------------------------------------------- | ------------------------------------------ |
| What & Why          | "Add CSV export so users can analyze offline" | "Add CSV export" (no Why)                  |
| Acceptance Criteria | "When user clicks Export, a .csv downloads"  | "CSV export works correctly"               |
| Scope — Out of      | "Excel format is out of scope"               | (omitted)                                  |
| Constraints         | "Must not add new dependencies"              | (omitted when there are known constraints) |
