---
name: documenting-apis
description: Generate API specification from codebase - endpoints, types, schemas.
allowed-tools: Read, Write, Grep, Glob, Task
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

## Schema Reading

| Rule                | Detail                                       |
| ------------------- | -------------------------------------------- |
| Read full file      | No grep — Read entire schema/route file      |
| Capture all fields  | Exact names, types, required/optional status |
| Source traceability | Record file:line for each type               |

## Confidence

| Evidence        | Level    |
| --------------- | -------- |
| Schema + route  | verified |
| Schema or route | inferred |
| Grep match only | unknown  |
