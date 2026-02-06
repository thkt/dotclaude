---
description: Generate documentation from codebase analysis
allowed-tools: Read, Write, Task, AskUserQuestion
model: opus
argument-hint: "[architecture|api|domain|setup]"
---

# /docs - Documentation Generator

Generate documentation by analyzing the codebase.

## Input

- Documentation type: `$1` (required)
  - `architecture` - Architecture overview with diagrams
  - `api` - API specification
  - `domain` - Domain glossary and relationships
  - `setup` - Environment setup guide
- If `$1` is empty → select type via AskUserQuestion

### Type Selection

| Question           | Options                             |
| ------------------ | ----------------------------------- |
| Documentation type | architecture / api / domain / setup |

## Execution

1. Call appropriate analyzer based on type:
   - `architecture` → `architecture-analyzer`
   - `api` → `api-analyzer`
   - `domain` → `domain-analyzer`
   - `setup` → `setup-analyzer`
2. Analyzer returns structured YAML
3. Load corresponding template:
   - [@../templates/docs/architecture.md](../templates/docs/architecture.md)
   - [@../templates/docs/api.md](../templates/docs/api.md)
   - [@../templates/docs/domain.md](../templates/docs/domain.md)
   - [@../templates/docs/setup.md](../templates/docs/setup.md)
4. Format YAML output using template structure
5. Present to user

## Flow

```text
[analyzer YAML] → [template] → [markdown output]
```

## Output

Formatted markdown using template structure. Variables: `{field}`, `{object.property}`, `{array[].property}`.

## Verification

| Check                           | Required |
| ------------------------------- | -------- |
| Correct analyzer `Task` called? | Yes      |
| Template applied to output?     | Yes      |
