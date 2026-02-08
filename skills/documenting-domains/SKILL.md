---
name: documenting-domains
description: Generate domain documentation from codebase analysis
tools: [Read, Write, Grep, Glob, Task]
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

| Category       | Targets                                        |
| -------------- | ---------------------------------------------- |
| Entities       | class, interface, dataclass, Prisma, ORM       |
| Invariants     | Validation logic, constraints, required fields |
| Domain Terms   | Class/function names, comments, JSDoc          |
| Relationships  | Entity references, inheritance, imports        |
| Business Rules | Validators, policies, domain services          |
| Domain Events  | Event classes, EventEmitter, pub/sub patterns  |

## ORM Extraction Rules

| ORM/Framework | Entity Detection             | Field Extraction                 | Invariant Detection                   |
| ------------- | ---------------------------- | -------------------------------- | ------------------------------------- |
| Prisma        | `model EntityName {`         | `fieldName Type @annotation`     | `@unique`, `@default`, `@@index`      |
| TypeORM       | `@Entity()` class            | `@Column()` property             | `@Check()`, class validators          |
| Sequelize     | `Model.init({...})`          | Properties in init config        | `validate:` options                   |
| Drizzle       | `pgTable()`, `sqliteTable()` | Column definitions               | `.notNull()`, `.unique()`             |
| Django        | `class X(models.Model)`      | `models.CharField(...)` etc      | `validators=`, `unique=True`          |
| SQLAlchemy    | `class X(Base)`              | `Column(Type, ...)` declarations | `CheckConstraint`, `UniqueConstraint` |
| Generic       | `class X` / `interface X`    | Property declarations + types    | throw/assert/validate in methods      |

## Schema Reading

| Rule                 | Detail                                      |
| -------------------- | ------------------------------------------- |
| Read full file       | Never grep for field values                 |
| Capture all fields   | Every field, not just "important" ones      |
| Preserve constraints | NOT NULL, required, @IsNotEmpty, validators |
| Preserve exact types | Use type names as defined, don't normalize  |
| Enum values          | All values in declaration order             |
| Source location      | Record file:line for each entity and field  |

## Confidence

| Evidence              | Level    |
| --------------------- | -------- |
| Schema + validator    | verified |
| Schema file only      | verified |
| Type/class definition | inferred |
| Grep match only       | unknown  |
