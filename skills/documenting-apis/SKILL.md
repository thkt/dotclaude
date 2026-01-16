---
name: documenting-apis
description: Generate API specification from codebase - endpoints, types, schemas.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# API Specification Generation

## Detection

| Category       | Pattern                                |
| -------------- | -------------------------------------- |
| Endpoints      | Express, Fastify, Next.js, Flask, etc. |
| Functions      | tree-sitter, TypeScript, JSDoc         |
| Types          | interface, type, Zod, Pydantic         |
| OpenAPI        | openapi.yaml, swagger.yaml             |
| Authentication | Auth middleware, JWT, OAuth patterns   |

## Framework Patterns

| Framework | Pattern                      |
| --------- | ---------------------------- |
| Express   | `app.get()`, `router.post()` |
| Next.js   | `app/api/**/route.ts`        |
| Flask     | `@app.route()`               |
| FastAPI   | `@app.get()`, `@app.post()`  |
