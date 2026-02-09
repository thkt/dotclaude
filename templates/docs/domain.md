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

> Source: {entities[].source_file}
> Directory: {entities[].directory_name} _(if different from entity name)_

| Field                      | Type                       | Nullable                       | Description                       | Source                            |
| -------------------------- | -------------------------- | ------------------------------ | --------------------------------- | --------------------------------- |
| {entities[].fields[].name} | {entities[].fields[].type} | {entities[].fields[].nullable} | {entities[].fields[].description} | {entities[].fields[].source_file} |

**Invariants**:

- {entities[].invariants[].rule} (`{entities[].invariants[].source_file}`)

**Polymorphic** _(if applicable)_:

Discriminator: `{entities[].polymorphic.discriminator}`

| Type Value                                     | Name                                     | Unique Fields                                                    | Source                                          |
| --------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| {entities[].polymorphic.variants[].type_value} | {entities[].polymorphic.variants[].name} | {entities[].polymorphic.variants[].unique_fields[].name}: {type} | {entities[].polymorphic.variants[].source_file} |

## Value Objects

### {value_objects[].name} [{value_objects[].confidence}]

> Source: {value_objects[].source_file} | Used by: {value_objects[].used_by}

| Field                           | Type                            | Nullable                            | Source                                 |
| ------------------------------- | ------------------------------- | ----------------------------------- | -------------------------------------- |
| {value_objects[].fields[].name} | {value_objects[].fields[].type} | {value_objects[].fields[].nullable} | {value_objects[].fields[].source_file} |

## Relationships

\`\`\`mermaid
{relationships.mermaid}
\`\`\`

| From                           | To                           | Type                           | Path                           | Source                                |
| ------------------------------ | ---------------------------- | ------------------------------ | ------------------------------ | ------------------------------------- |
| {relationships.details[].from} | {relationships.details[].to} | {relationships.details[].type} | {relationships.details[].path} | {relationships.details[].source_file} |

## Business Rules

| Rule                    | Description                    | Enforced By                    | Source                         |
| ----------------------- | ------------------------------ | ------------------------------ | ------------------------------ |
| {business_rules[].name} | {business_rules[].description} | {business_rules[].enforced_by} | {business_rules[].source_file} |

## Domain Events

| Event                  | Trigger                   | Subscribers                   | Source                        |
| ---------------------- | ------------------------- | ----------------------------- | ----------------------------- |
| {domain_events[].name} | {domain_events[].trigger} | {domain_events[].subscribers} | {domain_events[].source_file} |

## Code Issues

| Location                 | Severity                  | Description                  |
| ------------------------ | ------------------------- | ---------------------------- |
| {code_issues[].location} | {code_issues[].severity}  | {code_issues[].description}  |
```
