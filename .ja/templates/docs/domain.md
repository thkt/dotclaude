# Domain Template

## Structure

```markdown
# {project_name} - Domain Documentation

## Glossary

| Term              | Definition              | Context              |
| ----------------- | ----------------------- | -------------------- |
| {glossary[].term} | {glossary[].definition} | {glossary[].context} |

## Entities

### {entities[].name}

| Field                      | Type                       | Description                       |
| -------------------------- | -------------------------- | --------------------------------- |
| {entities[].fields[].name} | {entities[].fields[].type} | {entities[].fields[].description} |

**Invariants**:

- {entities[].invariants[]}

## Relationships

\`\`\`mermaid
{relationships.mermaid}
\`\`\`

## Business Rules

| Rule                    | Description                    | Enforced By                    |
| ----------------------- | ------------------------------ | ------------------------------ |
| {business_rules[].name} | {business_rules[].description} | {business_rules[].enforced_by} |

## Domain Events

| Event                  | Trigger                   | Subscribers                   |
| ---------------------- | ------------------------- | ----------------------------- |
| {domain_events[].name} | {domain_events[].trigger} | {domain_events[].subscribers} |
```
