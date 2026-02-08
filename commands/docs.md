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

## Execution

1. Call appropriate analyzer based on type:
   - `architecture` → `architecture-analyzer`
   - `api` → `api-analyzer`
   - `domain` → `domain-analyzer`
   - `setup` → `setup-analyzer`
2. Analyzer returns structured YAML
3. If type is `architecture`: Write YAML to `{project_root}/.analysis/architecture.yaml`
4. Load corresponding template:
   - [@../templates/docs/architecture.md](../templates/docs/architecture.md)
   - [@../templates/docs/api.md](../templates/docs/api.md)
   - [@../templates/docs/domain.md](../templates/docs/domain.md)
   - [@../templates/docs/setup.md](../templates/docs/setup.md)
5. Format YAML output using template structure
6. If type is `architecture`: Write to `{project_root}/.analysis/architecture.md`
7. Present to user

## Flow (architecture)

```text
[analyzer YAML] → .analysis/architecture.yaml (data)
               → [template] → .analysis/architecture.md (document)
```

## Output

Formatted markdown using template structure. Variables: `{field}`, `{object.property}`, `{array[].property}`.
