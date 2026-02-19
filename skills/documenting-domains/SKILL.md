---
name: documenting-domains
description: >
  Generate domain documentation from codebase analysis.
  Use when documenting domain models, entity relationships, business rules,
  or when user mentions ドメインモデル, エンティティ, ER図, domain model, entity documentation.
allowed-tools: [Read, Write, Grep, Glob, Task]
context: fork
user-invocable: false
---

# Domain Documentation

## Approach: Schema-First

Read entity/model files as source of truth.

| Priority | Source           | Method                             |
| -------- | ---------------- | ---------------------------------- |
| 1        | ORM schema files | Read full file, parse entities     |
| 2        | Type/class files | Read full file, extract fields     |
| 3        | Grep (fallback)  | Discovery only, never field values |

## Detection

| Category          | Targets                                                     |
| ----------------- | ----------------------------------------------------------- |
| Entities          | class, interface, dataclass, Prisma, ORM                    |
| Value Objects     | Embedded types with internal structure, no lifecycle        |
| Polymorphic Types | Discriminated unions, subtype hierarchies, variants         |
| Invariants        | Validation logic, constraints, required fields              |
| Domain Terms      | Class/function names, comments, JSDoc                       |
| Relationships     | Entity references, inheritance, imports (direct + indirect) |
| Business Rules    | Validators, policies, domain services                       |
| Domain Events     | Event classes, EventEmitter, pub/sub patterns               |
| Code Issues       | Typos, naming inconsistencies, null handling gaps           |

## Discovery Rule

Enumerate ALL directories under model root before reading. Every directory = potential entity or VO.

## Schema Reading

| Rule                | Detail                                                    |
| ------------------- | --------------------------------------------------------- |
| Read full file      | Never grep for field values. No Read evidence = no output |
| Capture all fields  | Every field with exact types as defined in code           |
| Nullable detection  | `?? null` → nullable; `?: T` → optional                   |
| Source traceability | Every output field → file:line from Read call             |

## Confidence

| Evidence              | Level    |
| --------------------- | -------- |
| Schema + validator    | verified |
| Type/class definition | inferred |
| Grep match only       | unknown  |
