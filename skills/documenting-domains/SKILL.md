---
name: documenting-domains
description: Generate domain documentation from codebase analysis
allowed-tools: Read, Write, Grep, Glob, Task
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

Enumerate ALL directories under model root before reading. Every directory = potential entity or VO. No directory left unaccounted.

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

| Rule                 | Detail                                                               |
| -------------------- | -------------------------------------------------------------------- |
| Read full file       | Never grep for field values                                          |
| Capture all fields   | Every field, not just "important" ones                               |
| Preserve exact types | Use type names as defined in code, including `\| null`               |
| Nullable detection   | `?? null` → nullable; no `?? null` → non-nullable; `?: T` → optional |
| Enum implementation  | Record form: named_enum, object_literal, or class_wrapped            |
| Enum values          | All values in declaration order; keys from actual code only          |
| Preserve constraints | NOT NULL, required, @IsNotEmpty, validators                          |
| Source location      | Project-relative path with line number consistently                  |
| Naming discrepancy   | Note directory name ≠ type name                                      |
| Code issues          | Flag typos, inconsistent patterns found during reading               |

Anti-Hallucination: Every output field MUST have `source_file` traced to a Read call. No Read evidence = no output.

### Prisma Schema

Parse `model X { ... }` blocks as entity source of truth. `Type?` = nullable, `@relation` = relationship, `enum X { ... }` = enum values.

## Confidence

| Evidence              | Level    |
| --------------------- | -------- |
| Schema + validator    | verified |
| Schema file only      | verified |
| Type/class definition | inferred |
| Grep match only       | unknown  |

## Validation Gate

Before output, verify:

| Check              | Rule                                                      |
| ------------------ | --------------------------------------------------------- |
| No phantom fields  | Every output field must trace to file:line from Read call |
| Directory coverage | Every model directory → entity or VO in output            |
| Nullable accuracy  | Every field's nullable status matches actual code pattern |
| Enum accuracy      | Enum keys/values match code exactly, form documented      |
| Path consistency   | All source paths use same project-relative format         |
| Relationship depth | Indirect relationships (A → B → C) included in ER         |
| Naming alignment   | Directory ≠ type name discrepancies noted                 |
