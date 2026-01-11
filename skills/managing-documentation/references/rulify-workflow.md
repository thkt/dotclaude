# Rulify Workflow

Generate enforceable rules from ADR decisions.

## Flow

```text
ADR (decision) → Rule (enforcement) → CLAUDE.md (integration)

/rulify <ADR-number>
    │
    ├─ Read ADR content
    │
    ├─ Extract enforceable rules
    │
    ├─ Generate rule file in rules/
    │
    └─ Update CLAUDE.md references
```

## Rule Extraction

From ADR sections:

| ADR Section  | Rule Content    |
| ------------ | --------------- |
| Decision     | What to enforce |
| Consequences | Why it matters  |
| Context      | When to apply   |

## Rule Template

````markdown
# [Rule Title]

## Rule

[Clear, actionable statement]

## Rationale

[Why this rule exists - from ADR Decision]

## Examples

### Good

```typescript
[Compliant example]
```

### Bad

```typescript
[Non-compliant example]
```

## Exceptions

[When rule can be bypassed]

## Related

- ADR: [@../adr/NNNN-slug.md]
````

## Output Locations

| File Type | Location                          |
| --------- | --------------------------------- |
| Rule file | `rules/[category]/[rule-name].md` |
| CLAUDE.md | Update references section         |

## Categories

| Category       | Purpose              |
| -------------- | -------------------- |
| `core/`        | Fundamental rules    |
| `guidelines/`  | Best practices       |
| `development/` | Implementation rules |
| `commands/`    | Command-specific     |

## CLAUDE.md Integration

Add reference to CLAUDE.md:

```markdown
### [Category] Rules

- [@./rules/category/rule-name.md](./rules/category/rule-name.md) - Brief description
```

## Example

ADR-0015: "Adopt TypeScript strict mode"

Generated rule:

````markdown
# TypeScript Strict Mode

## Rule

All TypeScript projects MUST enable strict mode in tsconfig.json.

## Rationale

Strict mode catches type errors at compile time, reducing runtime bugs.
(From ADR-0015: Adopt TypeScript strict mode)

## Examples

### Good

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### Bad

```json
{
  "compilerOptions": {
    "strict": false
  }
}
```

## Related

- ADR: [@../adr/0015-adopt-typescript-strict-mode.md]
````

## Related

- ADR workflow: [@./adr-workflow.md](./adr-workflow.md)
