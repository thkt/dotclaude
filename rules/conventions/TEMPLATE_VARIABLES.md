---
paths:
  - ".claude/templates/**"
  - ".claude/commands/**"
---

# Template Variable Syntax

Variable substitution syntax for templates and command outputs.

## Quick Reference

| Pattern | Input                         | Template          | Output          |
| ------- | ----------------------------- | ----------------- | --------------- |
| Simple  | `name: MyApp`                 | `{name}`          | `MyApp`         |
| Nested  | `summary: {total: 8}`         | `{summary.total}` | `8`             |
| Array   | `items: [{id: 1}, {id: 2}]`   | `{items[].id}`    | `1`, `2`        |
| Filter  | `list: [{p: high}, {p: low}]` | `{list[p=high]}`  | first match     |
| Exclude | `list: [{p: high}, {p: low}]` | `{list[p!=high]}` | all non-matches |

## Behavior Rules

| Rule             | Description                     |
| ---------------- | ------------------------------- |
| Empty array      | Renders nothing                 |
| Missing property | Renders empty string            |
| Filter `=`       | Returns first match only        |
| Filter `!=`      | Returns all non-matches         |
| All matches      | Use `{array[].prop}` not filter |

## Syntax Patterns

| Pattern                           | Description              | Example                                  |
| --------------------------------- | ------------------------ | ---------------------------------------- |
| `{field}`                         | Simple field             | `{project_name}`                         |
| `{object.property}`               | Nested property          | `{summary.total_findings}`               |
| `{array[].property}`              | Array iteration          | `{endpoints[].method}`                   |
| `{array[filter=value].property}`  | Filtered array (equals)  | `{priorities[priority=critical].action}` |
| `{array[filter!=value].property}` | Filtered array (exclude) | `{items[fix_type!=manual].id}`           |

## Usage Locations

| Location  | Files                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Commands  | `commands/audit.md`, `commands/docs.md`                                  |
| Templates | `templates/docs/*.md`, `templates/adr/*.md`, `templates/audit/output.md` |
|           | `templates/sow/template.md`, `templates/spec/template.md`                |
|           | `templates/issue/*.md`, `templates/research/template.md`                 |
