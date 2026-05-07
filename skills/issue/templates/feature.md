# Feature Template

## Structure

```markdown
## What & Why

[What to build - 1-2 sentences]
[Why it's needed - user problem or business reason]

## Acceptance Criteria

- [ ] [When X, then Y happens]
- [ ] [When X, then Y happens]

## Scope

- **In scope**: [What this issue covers]
- **Out of scope**: [What this issue explicitly excludes]

## Constraints (optional)

- [Technical constraints, prohibited approaches, dependencies]

## Testing Decisions

- [Definition of "good" for this issue: external behavior only, not implementation details]
- [Modules under test: which module/component/function gets tested]
- [Prior art: link or filename for the most similar existing test]
- [Skip rationale (optional): if no test is added, state why explicitly]
```

## Guidelines

| Field               | OK                                            | NG                                         |
| ------------------- | --------------------------------------------- | ------------------------------------------ |
| What & Why          | "Add CSV export so users can analyze offline" | "Add CSV export" (no Why)                  |
| Acceptance Criteria | "When user clicks Export, a .csv downloads"   | "CSV export works correctly"               |
| Scope - Out of      | "Excel format is out of scope"                | (omitted)                                  |
| Constraints         | "Must not add new dependencies"               | (omitted when there are known constraints) |
| Testing Decisions   | "Test the CSV serializer; mirror tests/orders.test.ts" | "TBD" or skipped without rationale |
