---
name: documenting-apis
description: Generate API specification from codebase - endpoints, types, schemas.
tools: [Read, Write, Grep, Glob, Task]
context: fork
user-invocable: false
---

# API Specification Generation

## Approach: Schema-First

Read schema/type files as source of truth. Do NOT grep for field extraction.

| Priority | Source           | Method                        |
| -------- | ---------------- | ----------------------------- |
| 1        | Schema files     | Read full file, parse fields  |
| 2        | Route/Repository | Read full file, extract paths |
| 3        | Grep (fallback)  | Discovery only                |

## Detection

| Category       | Pattern                                |
| -------------- | -------------------------------------- |
| Endpoints      | Express, Fastify, Next.js, Flask, etc. |
| Types          | interface, type, Zod, Pydantic         |
| OpenAPI        | openapi.yaml, swagger.yaml             |
| Authentication | Auth middleware, JWT, OAuth patterns   |

## Framework Patterns

| Framework  | Route Pattern                | Schema Pattern                        |
| ---------- | ---------------------------- | ------------------------------------- |
| Express    | `app.get()`, `router.post()` | `**/routes/**/*.ts`, imported schemas |
| Next.js    | `app/api/**/route.ts`        | Co-located or imported types          |
| Flask      | `@app.route()`               | `schemas.py`, Pydantic models         |
| FastAPI    | `@app.get()`, `@app.post()`  | Pydantic `BaseModel` in same file     |
| Repository | `repository.ts` methods      | `schema.ts` in same directory         |

## Schema Reading

| Rule                 | Detail                                         |
| -------------------- | ---------------------------------------------- |
| Read full file       | No grep — Read entire file                     |
| Capture all fields   | Every field, not just "important" ones         |
| Required/optional    | `?` or `.optional()` = optional, else required |
| Preserve exact names | Use field names as defined                     |
| Nested types         | Reference by name, document separately         |
| Source location      | Record file:line for each type                 |

## Confidence

| Evidence        | Level    |
| --------------- | -------- |
| Schema + route  | verified |
| Schema only     | inferred |
| Route only      | inferred |
| Grep match only | unknown  |
