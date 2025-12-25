---
description: Generate domain understanding documentation from codebase analysis
aliases: [domain-docs]
---

# /docs:domain - Domain Understanding Document Generation

## Overview

Analyzes codebase and automatically generates domain understanding documentation.

## Usage

```bash
# Analyze current directory
/docs:domain

# Analyze specific directory
/docs:domain src/

# Specify output destination
/docs:domain --output docs/DOMAIN.md
```

## Options

| Option | Description | Default |
| --- | --- | --- |
| `path` | Target directory to analyze | Current directory |
| `--output` | Output file path | `.claude/workspace/docs/domain-glossary.md` |
| `--format` | Output format | `markdown` |

## Generated Content

- **Entity List** - Data models, domain objects
- **Concept Relationship Diagram** - Entity relationships via Mermaid ER diagram
- **Domain Glossary** - Project-specific terms and descriptions
- **Use Case List** - Service/UseCase/Handler classes
- **Business Rules** - Overview of domain logic

## Detection Targets

### Entities/Models

| Framework | Detection Pattern |
| --- | --- |
| TypeScript | `class`, `interface` |
| Prisma | `model` definition |
| TypeORM | `@Entity` decorator |
| SQLAlchemy | `Base` subclass |
| Django | `models.Model` subclass |

### Business Logic

| Pattern | Description |
| --- | --- |
| `*Service*` | Service class |
| `*UseCase*` | Use case class |
| `*Handler*` | Handler class |
| `domain/` | Domain layer directory |

### Domain Terms

- Class names (CamelCase → terminology)
- Function names (verb + noun patterns)
- Descriptions from comments/docstrings

## Execution Flow

### Phase 1: Entity Extraction

```bash
~/.claude/skills/documenting-domains/scripts/extract-entities.sh {path}
```

### Phase 2: Glossary Extraction

```bash
~/.claude/skills/documenting-domains/scripts/extract-glossary.sh {path}
```

### Phase 3: ER Diagram Generation

```bash
~/.claude/skills/documenting-domains/scripts/generate-er-diagram.sh {path}
```

### Phase 4: Document Generation

Embed detection results into template (`~/.claude/skills/documenting-domains/assets/domain-template.md`)
and generate Markdown documentation.

### Phase 5: Markdown Validation

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

Validates generated Markdown for formatting issues. Non-blocking (warnings only).

## Output Example

```markdown
# Domain Understanding Document

## Entity List

| Entity | Description | Related |
|--------|-------------|---------|
| User | User information | Order, Profile |
| Order | Order information | User, Product |
| Product | Product information | Order, Category |

## Concept Relationship Diagram

\`\`\`mermaid
erDiagram
    User ||--o{ Order : places
    Order ||--|{ Product : contains
    Product }|--|| Category : belongs_to
\`\`\`

## Domain Glossary

| Term | Description |
| --- | --- |
| User | System user |
| Order | Product order |
```

## Error Handling

| Error | Action |
| --- | --- |
| No entities detected | Re-search with generic patterns |
| Prisma not used | Fallback to TypeScript analysis |
| README not found | Skip overview section |

## Related

- **Sibling Commands**: `/docs:architecture`, `/docs:setup`, `/docs:api`
