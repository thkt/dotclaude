---
paths:
  - ".claude/commands/**"
  - ".claude/skills/**"
---

# Workflow Reference

Detailed reference for command workflows. Loaded when editing commands or skills.

## Available Commands

### Core Development

| Command     | Purpose                                                          |
| ----------- | ---------------------------------------------------------------- |
| `/think`    | SOW creation with validation                                     |
| `/research` | Investigation without implementation                             |
| `/code`     | TDD/RGRC implementation                                          |
| `/test`     | Comprehensive testing                                            |
| `/audit`    | Code review via agents                                           |
| `/polish`   | Remove AI-generated slop                                         |
| `/validate` | Validate SOW conformance                                         |
| `/plans`    | List planning documents (SOW/Spec)                               |
| `/spec`     | Generate Spec (implementation details)                           |
| `/sow`      | Display SOW progress                                             |
| `/feature`  | Full feature lifecycle (explore + architect + implement + audit) |

### Quick Actions

| Command | Purpose                           |
| ------- | --------------------------------- |
| `/fix`  | Quick bug fixes (think→code→test) |

### Security

| Command | Purpose                  |
| ------- | ------------------------ |
| `/scan` | Plugin security scanning |

### Browser & Documentation

| Command   | Purpose                          |
| --------- | -------------------------------- |
| `/e2e`    | E2E test from browser operations |
| `/adr`    | Architecture Decision Record     |
| `/rulify` | Generate project rule from ADR   |
| `/docs`   | Generate documentation from code |

### Git Operations

| Command   | Purpose                       |
| --------- | ----------------------------- |
| `/branch` | Suggest branch names          |
| `/commit` | Conventional Commits messages |
| `/pr`     | PR descriptions               |
| `/issue`  | GitHub Issues                 |

## Todo Progress Tracking

Cross-session: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"`

| Command     | Todo Action                                        |
| ----------- | -------------------------------------------------- |
| `/think`    | TaskCreate from Implementation Plan                |
| `/code`     | TaskUpdate → in_progress / completed               |
| `/test`     | (via `/code` phase)                                |
| `/audit`    | (via `/code` phase)                                |
| `/validate` | TaskUpdate remaining → completed                   |
| `/feature`  | TaskCreate (Phase 1), TaskUpdate throughout phases |

## Architecture

| Layer   | Location            | Role                  |
| ------- | ------------------- | --------------------- |
| Command | `commands/*.md`     | User-facing workflows |
| Skill   | `skills/*/SKILL.md` | Knowledge base        |
| Agent   | `agents/**/*.md`    | Specialized analysis  |

## Command × Principle Mapping

| Command     | Primary Principles           | Secondary Principles                        |
| ----------- | ---------------------------- | ------------------------------------------- |
| `/think`    | SOLID, Occam's Razor         | Progressive Enhancement                     |
| `/research` | Strong Inference             | All principles for context                  |
| `/code`     | TDD, Baby Steps              | Readable Code, DRY, AI-Assisted Development |
| `/test`     | TDD                          | Law of Demeter, AI-Assisted Development     |
| `/fix`      | Occam's Razor                | TIDYINGS                                    |
| `/audit`    | All principles               | Priority order, Strong Inference            |
| `/feature`  | Progressive Enhancement      | TDD, SOLID, Occam's Razor                   |
| `/polish`   | Readable Code, Occam's Razor | DRY, YAGNI                                  |
| `/validate` | Output Verifiability         | Completion criteria                         |
| `/scan`     | Safety First                 | Strong Inference                            |
| `/commit`   | Readable Code                | Conventional Commits                        |
| `/branch`   | Readable Code                | Naming conventions                          |
| `/pr`       | Readable Code                | Documentation                               |
| `/issue`    | Readable Code                | Miller's Law                                |
| `/docs`     | Readable Code                | Progressive Enhancement                     |
| `/adr`      | SOLID                        | Leaky Abstraction                           |
| `/sow`      | Occam's Razor                | Progressive Enhancement                     |
| `/spec`     | Occam's Razor, SOLID         | TDD                                         |
| `/e2e`      | TDD                          | Progressive Enhancement                     |
| `/rulify`   | DRY                          | Readable Code                               |
| `/plans`    | —                            | Read-only reference                         |
