# Feature Template

## Structure

```markdown
## Summary

[What: what to build — 1-2 sentences] [Why: why it's needed — user problem or
business reason]

## Acceptance Criteria

- [ ] [Concrete behavior: "When X, Y happens"]
- [ ] [Concrete behavior]
- [ ] [Concrete behavior]

## Scope

- **In scope**: [What this issue covers]
- **Out of scope**: [What this issue explicitly excludes]

## Constraints (optional)

- [Technical constraints: libraries, performance requirements, etc.]
- [Prohibited approaches: what NOT to do]
- [Dependencies: issues or preconditions that must be met first]

## Notes (optional)

[Reference links, screenshots, related issues]
```

## Guidelines

| Field               | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| Summary             | Separate What + Why. Without Why, AI misinterprets the goal                   |
| Acceptance Criteria | Concrete examples: "When X, Y happens". Observable behavior, not how to build |
| Scope               | Out of scope is required. Without it, AI implements beyond the intended scope |
| Constraints         | State what NOT to do. Most effective guard against AI hallucination           |
| Notes               | Attach links or screenshots that inform decisions                             |
