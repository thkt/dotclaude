# Feature Template

When /issue classifies the request as feature, it generates the title and body from this skeleton.

## Template

`{...}` is replaced with content at generation. Sections marked `(optional)` are omitted, heading and all, when there is nothing to say. Fixed items (the ask, AC, decided constraints) stay unmarked; tentative items (AI-inferred HOW, an open decision) carry a `(tentative: <action at pickup>)` mark (§ Confidence Marking).

```markdown
## What & Why

{What to build - 1-2 sentences}
{Why it's needed - user problem or business reason}

## Acceptance Criteria

- [ ] {When X, then Y happens}
- [ ] {When X, then Y happens}

## Scope

- In scope: {What this issue covers}
- Out of scope: {What this issue explicitly excludes}

## Approach (optional)

- {Tentative implementation direction, a starting point rather than a fixed requirement: "place under OrderService to match existing structure (tentative: decide at pickup)"}

## Constraints (optional)

- {Technical constraints, prohibited approaches, dependencies}

## Premises (optional)

- {Unverified assumption the work depends on, with a recheck marker: "Design ref: <link>. Confirm latest before starting" / "Target files are candidates as of writing; recheck on pickup"}

## Testing Decisions

- {Definition of "good" for this issue: external behavior only, not implementation details}
- {Modules under test: which module/component/function gets tested}
- {Prior art: link or filename for the most similar existing test}
- {Skip rationale (optional): if no test is added, state why explicitly}
```

## Guidelines

| Field               | OK                                                     | NG                                         |
| ------------------- | ------------------------------------------------------ | ------------------------------------------ |
| What & Why          | "Add CSV export so users can analyze offline"          | "Add CSV export" (no Why)                  |
| Acceptance Criteria | "When user clicks Export, a .csv downloads"            | "CSV export works correctly"               |
| Scope - Out of      | "Excel format is out of scope"                         | (omitted)                                  |
| Approach            | "match OrderService structure; decide at pickup"       | Inferred HOW stated as a fixed requirement |
| Constraints         | "Must not add new dependencies"                        | (omitted when there are known constraints) |
| Premises            | "Figma node 9-2191; confirm latest before starting"    | Unverified design stated as fact           |
| Testing Decisions   | "Test the CSV serializer; mirror tests/orders.test.ts" | "TBD" or skipped without rationale         |
