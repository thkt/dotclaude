# Domain Template

## Structure

```markdown
# {project_name} - Domain Documentation

> Generated: {generated_at} | Framework: {meta.framework} | ORM: {meta.orm} | Confidence: {confidence_summary.verified} verified, {confidence_summary.inferred} inferred, {confidence_summary.unknown} unknown

## Glossary

| Term              | Definition              | Context              | Source                   |
| ----------------- | ----------------------- | -------------------- | ------------------------ |
| {glossary[].term} | {glossary[].definition} | {glossary[].context} | {glossary[].source_file} |

## Entities

### {entities[].name} [{entities[].confidence}]

| Field                      | Type                       | Required                       | Description                       | Source                            |
| -------------------------- | -------------------------- | ------------------------------ | --------------------------------- | --------------------------------- |
| {entities[].fields[].name} | {entities[].fields[].type} | {entities[].fields[].required} | {entities[].fields[].description} | {entities[].fields[].source_file} |

**Invariants**:

- {entities[].invariants[].rule} (`{entities[].invariants[].source_file}`)

## Relationships

\`\`\`mermaid
{relationships.mermaid}
\`\`\`

## Business Rules

| Rule                    | Description                    | Enforced By                    | Source                         |
| ----------------------- | ------------------------------ | ------------------------------ | ------------------------------ |
| {business_rules[].name} | {business_rules[].description} | {business_rules[].enforced_by} | {business_rules[].source_file} |

## Domain Events

| Event                  | Trigger                   | Subscribers                   | Source                        |
| ---------------------- | ------------------------- | ----------------------------- | ----------------------------- |
| {domain_events[].name} | {domain_events[].trigger} | {domain_events[].subscribers} | {domain_events[].source_file} |
```
