---
name: documenting-apis
description: Generate API specification from codebase - endpoints, types, schemas.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# API Specification Generation

Auto-generate API documentation from codebase analysis.

## Detection Items

| Category       | Targets                                |
| -------------- | -------------------------------------- |
| Endpoints      | Express, Fastify, Next.js, Flask, etc. |
| Functions      | tree-sitter, TypeScript, JSDoc         |
| Types          | interface, type, Zod, Pydantic         |
| OpenAPI        | openapi.yaml, swagger.yaml             |
| Base URL       | Environment config, constants          |
| Authentication | Auth middleware, JWT, OAuth patterns   |
| Error Format   | Error handlers, response formatters    |

## Detection Patterns

| Framework | Pattern                      |
| --------- | ---------------------------- |
| Express   | `app.get()`, `router.post()` |
| Next.js   | `app/api/**/route.ts`        |
| Flask     | `@app.route()`               |
| FastAPI   | `@app.get()`, `@app.post()`  |

## Quality Criteria

| Criteria                        | Target |
| ------------------------------- | ------ |
| New member can use API < 10 min | ✓      |
| Request/Response examples exist | ✓      |
| Error cases documented          | ✓      |
| Auth requirements clear         | ✓      |
