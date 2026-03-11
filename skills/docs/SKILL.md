---
name: docs
description:
  Generate documentation from codebase analysis. Use when user mentions
  ドキュメント生成, ドキュメント作って, generate docs, ドキュメント化.
allowed-tools: Read, Write, Task, AskUserQuestion
model: opus
argument-hint: "[architecture|api|domain|setup]"
user-invocable: true
---

# /docs - Documentation Generator

## Input

`$1` (required): `architecture` | `api` | `domain` | `setup`

If empty, use AskUserQuestion to select.

## Execution

1. Call analyzer: `architecture-analyzer`, `api-analyzer`, `domain-analyzer`, or
   `setup-analyzer`
2. Analyzer returns structured YAML
3. Validate YAML has required top-level keys (error → report "Analyzer returned
   invalid YAML")
4. Load template from `templates/docs/{type}.md`
5. Format YAML using template structure
6. Write to `workspace/docs/{type}.md`
7. Present to user

## Flow

```text
[analyzer YAML] → [template] → workspace/docs/{type}.md (document)
```

## Required Keys by Type

| Type         | Required Keys                                                            |
| ------------ | ------------------------------------------------------------------------ |
| architecture | `project_name`, `tech_stack`, `key_components`, `dependencies`           |
| api          | `project_name`, `meta`, `endpoints`                                      |
| domain       | `project_name`, `generated_at`, `meta`, `confidence_summary`, `entities` |
| setup        | `project_name`, `prerequisites`, `installation`                          |

Step 3 validates against this table. Missing key → report which keys are absent.

## Output

Markdown formatted with template. Variables: `{field}`, `{object.property}`,
`{array[].property}`. Conditional: `{field? (foreach)}...{/foreach}` for
optional arrays.
