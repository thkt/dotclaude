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

## Examples

### Simple Field

```yaml
# YAML input
project_name: MyApp

# Template
Project: {project_name}

# Output
Project: MyApp
```

### Nested Property

```yaml
# YAML input
summary:
  total_findings: 8
  by_severity:
    critical: 0
    high: 2

# Template
Findings: {summary.total_findings} | Critical {summary.by_severity.critical}

# Output
Findings: 8 | Critical 0
```

### Array Iteration

```yaml
# YAML input
endpoints:
  - method: GET
    path: /users
  - method: POST
    path: /users

# Template
{endpoints[].method} {endpoints[].path}

# Output (one per item)
GET /users
POST /users
```

### Filtered Array

```yaml
# YAML input
priorities:
  - priority: critical
    action: Fix immediately
  - priority: high
    action: Fix this sprint

# Template
Immediate: {priorities[priority=critical].action}

# Output
Immediate: Fix immediately
```

## Usage Locations

| Location  | Files                                       |
| --------- | ------------------------------------------- |
| Commands  | `commands/audit.md`, `commands/docs.md`     |
| Templates | `templates/docs/*.md`, `templates/adr/*.md` |
