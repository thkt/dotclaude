---
description: Generate API specification documentation from codebase analysis
aliases: [api-docs]
---

# /docs:api - API Specification Generation

## Overview

Analyzes codebase and automatically generates API specification documentation.

## Usage

```bash
# Analyze current directory
/docs:api

# Analyze specific directory
/docs:api src/

# Specify output destination
/docs:api --output docs/API.md
```

## Options

| Option | Description | Default |
| --- | --- | --- |
| `path` | Target directory to analyze | Current directory |
| `--output` | Output file path | `.claude/workspace/docs/api-reference.md` |
| `--format` | Output format | `markdown` |

## Generated Content

- **Endpoint List** - HTTP methods, paths, handler information
- **Function Signatures** - Parameters, return types
- **Type Definitions** - Interface, Type, Zod/Pydantic schemas
- **Request/Response Examples** - Sample JSON

## Detection Targets

### Node.js Frameworks

| Framework | Detection Pattern |
| --- | --- |
| Express.js | `app.get()`, `router.post()`, etc. |
| Fastify | `fastify.get()`, etc. |
| Hono | `app.get()`, etc. |
| Next.js App Router | `app/api/**/route.ts` |
| Next.js Pages Router | `pages/api/**/*.ts` |

### Python Frameworks

| Framework | Detection Pattern |
| --- | --- |
| Flask | `@app.route()` decorator |
| FastAPI | `@app.get()` decorator |
| Django REST | `@api_view` decorator |

### Type Definitions

| Type | Detection Pattern |
| --- | --- |
| TypeScript | `interface`, `type` |
| Zod | `z.object()` schema |
| Python dataclass | `@dataclass` decorator |
| Pydantic | `BaseModel` subclass |

### OpenAPI/Swagger

| File | Detection Content |
| --- | --- |
| openapi.yaml/json | OpenAPI 3.x specification |
| swagger.yaml/json | Swagger 2.x specification |

## Execution Flow

### Phase 1: Endpoint Detection

```bash
~/.claude/skills/documenting-apis/scripts/detect-endpoints.sh {path}
```

### Phase 2: Type Definition Extraction

```bash
~/.claude/skills/documenting-apis/scripts/extract-types.sh {path}
```

### Phase 3: Document Generation

Embed detection results into template (`~/.claude/skills/documenting-apis/assets/api-template.md`)
and generate Markdown documentation.

### Phase 4: Markdown Validation

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

Validates generated Markdown for formatting issues. Non-blocking (warnings only).

## Output Example

```markdown
# API Specification

## Endpoint List

| Method | Path | Description |
| --- | --- | --- |
| GET | /api/users | Get user list |
| POST | /api/users | Create user |
| GET | /api/users/:id | Get user details |

## Type Definitions

### User
| Field | Type | Description |
| --- | --- | --- |
| id | string | User ID |
| name | string | User name |
| email | string | Email address |
```

## Error Handling

| Error | Action |
| --- | --- |
| No endpoints detected | Display supported frameworks list |
| tree-sitter-analyzer not installed | Grep fallback |
| No OpenAPI spec | Infer from codebase |

## Related

- **Sibling Commands**: `/docs:architecture`, `/docs:setup`
