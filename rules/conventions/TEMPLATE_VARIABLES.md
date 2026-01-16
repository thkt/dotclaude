# Template Variable Syntax

Specification for variable substitution in templates and command outputs.

## Syntax Patterns

| Pattern                          | Description     | Example                                  |
| -------------------------------- | --------------- | ---------------------------------------- |
| `{field}`                        | Simple field    | `{project_name}`                         |
| `{object.property}`              | Nested property | `{summary.total_findings}`               |
| `{array[].property}`             | Array iteration | `{endpoints[].method}`                   |
| `{array[filter=value].property}` | Filtered array  | `{priorities[priority=critical].action}` |

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

| Location  | Files                                   |
| --------- | --------------------------------------- |
| Commands  | `commands/audit.md`, `commands/docs.md` |
| Templates | `templates/docs/*.md`                   |

## Notes

- Empty arrays render nothing
- Missing properties render as empty string
- Filters match first occurrence only
- For all matches, use array iteration: `{array[].property}` instead of filter
