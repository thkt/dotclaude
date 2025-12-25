---
name: documenting-domains
description: >
  Generate domain understanding documentation from codebase analysis.
  Extracts entities, business logic, domain terms, and concept relationships.
  Triggers: domain understanding, glossary, entities, business logic,
  domain model, ER diagram, use cases.
allowed-tools: Read, Write, Grep, Glob, Bash, Task
---

# docs:domain - Domain Understanding Generation

Auto-generate domain documentation from codebase analysis.

## Detection Items

| Category | Targets |
| --- | --- |
| Entities/Models | class, interface, dataclass, Pydantic, Prisma, TypeORM, SQLAlchemy |
| Domain Terms | Class/function names, comments, JSDoc, docstrings |
| Relationships | Entity references, inheritance, import analysis |
| Use Cases | Service/UseCase classes, Handler/Controller functions |

## Analysis Scripts

| Script | Purpose |
| --- | --- |
| `scripts/extract-entities.sh` | Entity name, fields, relationships |
| `scripts/extract-glossary.sh` | Terms, frequency, context |
| `scripts/generate-er-diagram.sh` | Mermaid ER diagram |

## Generated Structure

```markdown
# Domain Understanding Document

## Entity List
### User
- id: string
- name: string
Related: Order, Profile

## Concept Relationship Diagram
(Mermaid ER diagram)

## Domain Glossary
| Term | Description | Related |

## Use Case List
| Use Case | Description | Entities |
```

## Usage

```bash
/docs:domain              # Generate domain docs
"Generate domain glossary" # Natural language
```

## Markdown Validation

After generation, validate output with:

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

Non-blocking (warnings only) - style issues don't block document creation.

## References

- Related: `documenting-architecture`, `documenting-apis`, `setting-up-docs`
