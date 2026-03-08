# Bug Report Template

## Structure

```markdown
## Summary

[What: what is broken — 1 sentence] [Why: user impact — why this matters]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected vs Actual

- **Expected**: [What should happen — specific values or behavior]
- **Actual**: [What happens instead — error messages or actual values]

## Scope

- **In scope**: [What this issue fixes]
- **Out of scope**: [Related but not addressed in this issue]

## Constraints (optional)

- [Fix constraints: no breaking changes, performance requirements, etc.]
- [Prohibited approaches: fix root cause not workaround, etc.]

## Environment (optional)

- Browser/OS: [e.g., Chrome 120 / macOS 14]
- Version: [e.g., v1.2.3]

## Notes (optional)

[Error logs, screenshots, related issues]
```

## Guidelines

| Field              | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| Summary            | Separate What + Why. Without impact, AI misjudges priority                 |
| Steps to Reproduce | Minimal steps. AI uses these to generate test cases                        |
| Expected vs Actual | Concrete values. "Works correctly" is NG — "Returns 200" is OK             |
| Scope              | Out of scope limits fix range. Prevents bug fix from expanding to refactor |
| Constraints        | "No workarounds", "Maintain backward compat", etc. Prevents shallow fixes  |
| Environment        | Only when bug is environment-specific                                      |
