---
name: documenting-apis
description: >
  Generate API specification documentation from codebase analysis.
  Detects REST endpoints, function signatures, type definitions, and schemas.
  Use when: API specification, endpoints, REST API, type definitions,
  OpenAPI, Swagger, API documentation.
allowed-tools: Read, Write, Grep, Glob, Bash, Task

triggers:
  keywords:
    - "API specification"
    - "endpoints"
    - "REST API"
    - "type definitions"
    - "OpenAPI"
    - "Swagger"
---

# docs:api Skill

Automatically generate API specification documentation.

## Features

### Detection Items

1. **REST API Endpoints**
   - Express.js: `app.get()`, `router.post()`, etc.
   - Fastify: `fastify.get()`, etc.
   - Hono: `app.get()`, etc.
   - Next.js: `app/api/**/route.ts`, `pages/api/**/*.ts`
   - Flask: `@app.route()` decorator
   - FastAPI: `@app.get()` decorator
   - Django REST: `@api_view` decorator

2. **Function Signatures**
   - Function definition extraction via tree-sitter-analyzer
   - TypeScript type annotations
   - JSDoc comments
   - Python docstrings

3. **Type Definitions**
   - TypeScript: interface, type
   - Zod: z.object() schemas
   - Yup: yup.object() schemas
   - Python: dataclass, TypedDict, Pydantic

4. **OpenAPI/Swagger**
   - openapi.yaml, swagger.yaml
   - openapi.json, swagger.json

## Analysis Scripts

### detect-endpoints.sh

Detect API endpoints:

```bash
~/.claude/skills/documenting-apis/scripts/detect-endpoints.sh {path}
```

**Output:**

- HTTP method
- Endpoint path
- Handler function name
- File location

### extract-types.sh

Extract type definitions:

```bash
~/.claude/skills/documenting-apis/scripts/extract-types.sh {path}
```

**Output:**

- Type name
- Field definitions
- Related types

## Generated Document Structure

```markdown
# API Specification

## Overview
- Base URL
- Authentication method
- Response format

## Endpoint List

### GET /api/users
**Description**: Get user list

**Request**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |

**Response**:
\`\`\`json
{
  "users": [...]
}
\`\`\`

## Type Definitions

### User
| Field | Type | Description |
|-------|------|-------------|
| id | string | User ID |
| name | string | User name |
```

## Template

`assets/api-template.md` - Markdown template for API specification

## Usage

```bash
# Call from command
/docs:api

# Direct skill reference
"Generate API specification"
```

## Related

- Sibling skills: `documenting-architecture`, `setting-up-docs`
- Command: `/docs:api`
