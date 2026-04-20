---
paths:
  - ".claude/templates/**"
---

# Template Variables

Variable substitution syntax for templates and command outputs.

## Syntax

| Pattern                           | Input                         | Output          | Description      |
| --------------------------------- | ----------------------------- | --------------- | ---------------- |
| `{field}`                         | `name: MyApp`                 | `MyApp`         | Simple field     |
| `{object.property}`               | `summary: {total: 8}`         | `8`             | Nested           |
| `{array[].property}`              | `items: [{id: 1}, {id: 2}]`   | `1`, `2`        | Array iteration  |
| `{array[filter=value].property}`  | `list: [{p: high}, {p: low}]` | first match     | Filter (equals)  |
| `{array[filter!=value].property}` | `list: [{p: high}, {p: low}]` | all non-matches | Filter (exclude) |

## Edge cases

| Input            | Output               |
| ---------------- | -------------------- |
| Empty array      | Renders nothing      |
| Missing property | Renders empty string |
