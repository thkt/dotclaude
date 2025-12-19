---
name: documenting-domains
description: >
  Generate domain understanding documentation from codebase analysis.
  Extracts entities, business logic, domain terms, and concept relationships.
  Use when: domain understanding, glossary, entities, business logic,
  domain model, ER diagram, use cases.
allowed-tools: Read, Write, Grep, Glob, Bash, Task

triggers:
  keywords:
    - "domain understanding"
    - "glossary"
    - "entities"
    - "business logic"
    - "domain model"
---

# docs:domain Skill

Automatically generate domain understanding documentation.

## Features

### Detection Items

1. **Entities/Models**
   - TypeScript: class, interface (data structures)
   - Python: dataclass, Pydantic Model
   - Database models (Prisma, TypeORM, SQLAlchemy)

2. **Domain Terms**
   - Extract from class names, function names
   - Extract descriptions from comments/JSDoc/docstrings
   - Parse CamelCase/snake_case into terms

3. **Concept Relationships**
   - References between entities
   - Inheritance relationships
   - Dependencies (import statement analysis)

4. **Use Cases/Services**
   - Service/UseCase classes
   - Handler/Controller functions
   - Modules containing business logic

## Analysis Scripts

### extract-entities.sh

Extract entities and models:

```bash
~/.claude/skills/documenting-domains/scripts/extract-entities.sh {path}
```

**Output:**

- Entity name
- Field list
- Related entities

### extract-glossary.sh

Extract domain terms:

```bash
~/.claude/skills/documenting-domains/scripts/extract-glossary.sh {path}
```

**Output:**

- Term
- Occurrence frequency
- Context

### generate-er-diagram.sh

Generate concept relationship diagram (Mermaid ER diagram):

```bash
~/.claude/skills/documenting-domains/scripts/generate-er-diagram.sh {path}
```

## Generated Document Structure

```markdown
# Domain Understanding Document

## Overview
Description of the project's business domain

## Entity List
### User
- id: string
- name: string
- email: string
Related: Order, Profile

## Concept Relationship Diagram
(Mermaid ER diagram)

## Domain Glossary
| Term | Description | Related Entities |
|------|-------------|------------------|

## Use Case List
| Use Case | Description | Related Entities |
|----------|-------------|------------------|
```

## Template

`assets/domain-template.md` - Markdown template for domain understanding documentation

## Usage

```bash
# Call from command
/docs:domain

# Direct skill reference
"Generate a domain glossary"
```

## Related

- Sibling skills: `documenting-architecture`, `setting-up-docs`, `documenting-apis`
- Command: `/docs:domain`
