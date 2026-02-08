---
description: Generate documentation from codebase analysis
tools: [Read, Write, Task, AskUserQuestion]
model: opus
argument-hint: "[architecture|api|domain|setup]"
---

# /docs - Documentation Generator

## Input

`$1` (required): `architecture` | `api` | `domain` | `setup`

If empty, use AskUserQuestion to select.

## Execution

1. Call analyzer: `architecture-analyzer`, `api-analyzer`, `domain-analyzer`, or `setup-analyzer`
2. Analyzer returns structured YAML
3. Validate YAML has required top-level keys (error → report "Analyzer returned invalid YAML")
4. For `architecture` or `api`: Write YAML to `.analysis/{type}.yaml`
5. Load template from `templates/docs/{type}.md`
6. Format YAML using template structure
7. For `architecture` or `api`: Write to `.analysis/{type}.md`
8. Present to user

## Flow (architecture / api)

```text
[analyzer YAML] → .analysis/{type}.yaml (data)
               → [template] → .analysis/{type}.md (document)
```

## Output

Markdown formatted with template. Variables: `{field}`, `{object.property}`, `{array[].property}`.
