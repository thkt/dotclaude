# Domain Template

## Structure

```markdown
# <project_name> - Domain Documentation

## Glossary

| Term   | Definition   | Context      |
| ------ | ------------ | ------------ |
| <term> | <definition> | <where used> |

## Entities

### <entity_name>

| Field   | Type   | Description   |
| ------- | ------ | ------------- |
| <field> | <type> | <description> |

**Invariants**:

- <invariant 1>
- <invariant 2>

## Relationships

\`\`\`mermaid
erDiagram
EntityA ||--o{ EntityB : "has many"
EntityB }|--|| EntityC : "belongs to"
\`\`\`

## Business Rules

| Rule        | Description   | Enforced By |
| ----------- | ------------- | ----------- |
| <rule_name> | <description> | <component> |

## Domain Events

| Event        | Trigger          | Subscribers   |
| ------------ | ---------------- | ------------- |
| <event_name> | <when triggered> | <who listens> |
```

## Guidelines

| Section        | Description                                    |
| -------------- | ---------------------------------------------- |
| Glossary       | Domain-specific terms and definitions          |
| Entities       | Core domain objects with fields and invariants |
| Relationships  | ER diagram showing entity connections          |
| Business Rules | Domain rules and where they're enforced        |
| Domain Events  | Events and their subscribers                   |
