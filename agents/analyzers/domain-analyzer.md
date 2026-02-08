---
name: domain-analyzer
description: Analyze codebase domain model, generate domain documentation
tools: [Read, Grep, Glob, LS]
model: opus
skills: [documenting-domains]
context: fork
---

# Domain Analyzer

## Analysis Phases

| Phase | Action                 | Method                                                                   |
| ----- | ---------------------- | ------------------------------------------------------------------------ |
| 0     | Seed Context           | Read `.analysis/architecture.yaml` (if exists) for domain hints          |
| 1     | Framework Detection    | Glob for `package.json`, `requirements.txt`, `go.mod`; Read to identify  |
| 2     | Schema Discovery       | Glob for entity/model definition files (see patterns below)              |
| 3     | Schema Reading         | Read each file, extract entities, fields, types, constraints, enums      |
| 4     | Domain Logic Discovery | Glob for Service/UseCase/Policy files; Read for rules, events, relations |
| 5     | Glossary Extraction    | Derive terms from entity names, field names, JSDoc/docstrings            |
| 6     | Confidence Tagging     | Assign verified/inferred/unknown per entity per field                    |

### Phase 2: Schema Discovery Patterns

| ORM/Framework | Glob Pattern                                           |
| ------------- | ------------------------------------------------------ |
| Prisma        | `**/prisma/schema.prisma`, `**/schema.prisma`          |
| TypeORM       | `**/entities/**/*.ts`, `**/*.entity.ts`                |
| Sequelize     | `**/models/**/*.ts`, `**/models/**/*.js`               |
| Drizzle       | `**/schema.ts`, `**/*.schema.ts`, `**/drizzle/**/*.ts` |
| Django        | `**/models.py`, `**/**/models.py`                      |
| SQLAlchemy    | `**/models.py`, `**/models/**/*.py`                    |
| Generic TS    | `**/types.ts`, `**/types/**/*.ts`, `**/domain/**/*.ts` |
| Generic Py    | `**/schemas.py`, `**/dataclasses/**/*.py`              |

### Phase 3: Schema Reading

- Entity/model name and source location (file:line)
- All fields: name, type, required/optional, constraints
- Enum definitions (values in declaration order)
- Co-located invariants (validators, constraints, decorators)

### Phase 4: Domain Logic Discovery

| Category        | Glob Pattern                                                 |
| --------------- | ------------------------------------------------------------ |
| Services        | `**/*Service.ts`, `**/*UseCase.ts`, `**/services/**/*.ts`    |
| Validators      | `**/*Validator.ts`, `**/*Policy.ts`, `**/validators/**/*.ts` |
| Events          | `**/*Event.ts`, `**/events/**/*.ts`, `**/*Listener.ts`       |
| Python services | `**/services/**/*.py`, `**/use_cases/**/*.py`                |

Extract business rules, domain events, and entity relationships (imports, FK references).

### Phase 6: Confidence Rules

| Condition                       | Tag      | Evidence                    |
| ------------------------------- | -------- | --------------------------- |
| ORM schema + validator confirm  | verified | file:line from both sources |
| ORM schema file Read only       | verified | file:line from schema       |
| Type/class definition Read only | inferred | file:line from type/class   |
| Grep pattern match, no Read     | unknown  | grep match noted            |

## Error Handling

| Error           | Action                                          |
| --------------- | ----------------------------------------------- |
| No schema found | Fall back to class/interface scan, all inferred |
| No entities     | Report "No domain model detected"               |
| No ORM detected | Use Generic TS/Py patterns                      |
| Large project   | Sample top 50 entities, note sampling in output |

## Output

Structured YAML:

```yaml
project_name: <name>
generated_at: <ISO 8601 timestamp>
source: analyzer
meta:
  framework: <detected framework>
  orm: <detected ORM or "none">
confidence_summary:
  verified: <count>
  inferred: <count>
  unknown: <count>
glossary:
  - term: <term>
    definition: <definition>
    context: <where used>
    source_file: <file:line>
entities:
  - name: <entity_name>
    source_file: <file:line>
    confidence: <verified|inferred|unknown>
    fields:
      - name: <field>
        type: <type>
        required: <true|false>
        description: <description>
        enum_values: [<value1>, <value2>]
        source_file: <file:line>
        confidence: <verified|inferred|unknown>
    invariants:
      - rule: <invariant description>
        source_file: <file:line>
relationships:
  mermaid: |
    erDiagram
    EntityA ||--o{ EntityB : "has many"
  details:
    - from: <entity>
      to: <entity>
      type: <one-to-one|one-to-many|many-to-many>
      source_file: <file:line>
business_rules:
  - name: <rule_name>
    description: <description>
    enforced_by: <component>
    source_file: <file:line>
domain_events:
  - name: <event_name>
    trigger: <when triggered>
    subscribers: [<who listens>]
    source_file: <file:line>
```
