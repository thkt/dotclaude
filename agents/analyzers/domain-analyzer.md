---
name: domain-analyzer
description: Analyze codebase domain model, generate domain documentation.
tools: [Bash, Read, Grep, Glob, LS]
model: opus
skills: [documenting-domains]
context: fork
---

# Domain Analyzer

Generate domain documentation from codebase analysis.

## Generated Content

| Section        | Description                  |
| -------------- | ---------------------------- |
| Glossary       | Domain-specific terms        |
| Entities       | Core objects with invariants |
| Relationships  | ER diagram of connections    |
| Business Rules | Domain rules and enforcement |
| Domain Events  | Events and subscribers       |

## Analysis Phases

| Phase | Action           | Command                                      |
| ----- | ---------------- | -------------------------------------------- |
| 1     | Entity Detection | `grep -r "class\|interface\|@Entity\|model"` |
| 2     | Field Extraction | Read entity files, extract properties        |
| 3     | Invariant Search | `grep -r "validate\|assert\|require\|throw"` |
| 4     | Relation Mapping | `grep -r "belongsTo\|hasMany\|@Relation"`    |
| 5     | Event Detection  | `grep -r "Event\|emit\|publish\|subscribe"`  |
| 6     | Rule Detection   | `grep -r "Policy\|Rule\|Validator\|Service"` |

## Error Handling

| Error           | Action                   |
| --------------- | ------------------------ |
| No entities     | Report "No domain model" |
| No ORM detected | Use class/interface scan |
| Large project   | Focus on core domain     |

## Output

Return structured YAML:

```yaml
project_name: <name>
glossary:
  - term: <term>
    definition: <definition>
    context: <where used>
entities:
  - name: <entity_name>
    fields:
      - name: <field>
        type: <type>
        description: <description>
    invariants:
      - <invariant 1>
      - <invariant 2>
relationships:
  mermaid: |
    erDiagram
    EntityA ||--o{ EntityB : "has many"
    EntityB }|--|| EntityC : "belongs to"
business_rules:
  - name: <rule_name>
    description: <description>
    enforced_by: <component>
domain_events:
  - name: <event_name>
    trigger: <when triggered>
    subscribers: [<who listens>]
```
