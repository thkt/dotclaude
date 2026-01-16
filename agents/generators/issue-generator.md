---
name: issue-generator
description: Generate well-structured GitHub Issues from descriptions.
tools: [Bash]
model: opus
skills: [utilizing-cli-tools]
context: fork
---

# Issue Generator

Generate GitHub Issues with structured templates.

## Type Detection

Infer type from issue context:

| Type      | When to use                                             |
| --------- | ------------------------------------------------------- |
| `bug`     | Something existing is broken or not working as expected |
| `feature` | New capability or enhancement request                   |
| `docs`    | Documentation additions or corrections                  |
| `chore`   | Maintenance, config, or dependency updates              |

Default to `feature` if unclear.

## Issue Types

| Type      | Prefix    | Use Case                  |
| --------- | --------- | ------------------------- |
| `bug`     | [Bug]     | Something isn't working   |
| `feature` | [Feature] | New functionality request |
| `docs`    | [Docs]    | Documentation improvement |
| `chore`   | [Chore]   | Maintenance task          |

## Templates

| Type    | Template                                                                    |
| ------- | --------------------------------------------------------------------------- |
| bug     | [@../../../templates/issue/bug.md](../../../templates/issue/bug.md)         |
| feature | [@../../../templates/issue/feature.md](../../../templates/issue/feature.md) |
| docs    | [@../../../templates/issue/docs.md](../../../templates/issue/docs.md)       |
| chore   | [@../../../templates/issue/chore.md](../../../templates/issue/chore.md)     |

## Labels

| Type    | Labels                   |
| ------- | ------------------------ |
| Bug     | `bug`, `priority:*`      |
| Feature | `enhancement`, `feature` |
| Task    | `task`, `chore`          |

## Priority

| Label               | Meaning            |
| ------------------- | ------------------ |
| `priority:critical` | Production down    |
| `priority:high`     | Significant impact |
| `priority:medium`   | Normal             |
| `priority:low`      | Nice to have       |

## Error Handling

| Error              | Action                 |
| ------------------ | ---------------------- |
| No description     | Prompt for description |
| Template not found | Use default format     |

## Output

Return structured YAML with template-based body:

```yaml
type: <type>
title: <title>
body: |
  <content following the template structure>
```
