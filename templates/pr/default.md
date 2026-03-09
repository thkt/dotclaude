# PR Template

## Structure

```markdown
## What & Why

[What this PR does — 1-2 sentences]
[Why — what problem it solves or what it enables]

## Changes

- [Change 1: what was done and why]
- [Change 2: what was done and why]

## Scope (optional)

- **Not included**: [What this PR intentionally does NOT do]

## Design Decisions

- [Why this approach was chosen over alternatives]

## How to Test

1. [Step]
2. [Expected result]

## Related

- Closes #[issue]
```

## Guidelines

| Field            | OK                                                  | NG                                       |
| ---------------- | --------------------------------------------------- | ---------------------------------------- |
| What & Why       | "Add CSV export to unblock offline analysis"       | "Add CSV export feature" (no Why)        |
| Changes          | "Add ExportButton — chosen over menu for 1-click"  | "Added files" (no reasoning)             |
| Scope            | "Auth token refresh is not included (separate PR)" | (omitted on large PRs — reviewer guesses boundary) |
| Design Decisions | "Used streaming to avoid OOM on large datasets"    | (omitted — forces reviewer to guess why) |
| How to Test      | "Click Export → verify .csv downloads with 3 rows" | "Test the feature" (vague)               |
