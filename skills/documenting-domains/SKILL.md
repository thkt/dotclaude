---
name: documenting-domains
description: Generate domain documentation from codebase analysis - entities, glossary, relationships.
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# Domain Understanding Generation

## Detection

| Category       | Targets                                        |
| -------------- | ---------------------------------------------- |
| Entities       | class, interface, dataclass, Prisma, ORM       |
| Invariants     | Validation logic, constraints, required fields |
| Domain Terms   | Class/function names, comments, JSDoc          |
| Relationships  | Entity references, inheritance, imports        |
| Business Rules | Validators, policies, domain services          |
| Domain Events  | Event classes, EventEmitter, pub/sub patterns  |

## ORM Patterns

| ORM/Framework | Pattern                    |
| ------------- | -------------------------- |
| Prisma        | `model User {}`            |
| TypeORM       | `@Entity()`, `@Column()`   |
| Sequelize     | `Model.init()`             |
| Django        | `class User(models.Model)` |
| SQLAlchemy    | `class User(Base)`         |
