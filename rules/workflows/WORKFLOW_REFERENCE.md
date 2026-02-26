---
paths:
  - ".claude/commands/**"
  - ".claude/skills/**"
---

# Workflow Reference

## Standard Workflows

| Pattern       | Workflow                                                                             | When                                  |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| Quick Fix     | `/fix`                                                                               | Small bug, stable codebase            |
| Investigation | `/research` → `/fix`                                                                 | Unknown cause                         |
| Feature       | `/feature` (or: `/research` → `/think` → `/code` → `/test` → `/audit` → `/validate`) | New capability, requirements unstable |
| Simple        | `/code` → `/test`                                                                    | Clear implementation                  |

## Command Selection

| Understanding | Complexity | Result            |
| ------------- | ---------- | ----------------- |
| ≥95%          | Simple     | `/fix` or `/code` |
| 70-94%        | Any        | `/think`          |
| <70%          | Any        | `/research`       |
| Any           | Critical   | `/fix` (urgent)   |
| Any           | Unclear    | `/research`       |

## Team-First Principle

Default: Team (TeamCreate + TaskList for progress tracking)

| Command     | Mode | Notes                       |
| ----------- | ---- | --------------------------- |
| `/feature`  | Team | Existing team structure     |
| `/audit`    | Auto | Scope-based decision        |
| `/think`    | Solo |                             |
| `/code`     | Auto | Scope-based decision        |
| `/fix`      | Auto | Solo conditions below       |
| `/research` | Solo |                             |
| Utility     | Solo | /commit, /branch, /pr, etc. |

Auto: All solo conditions met → Solo, otherwise → Team

| Solo Condition             | Example                          |
| -------------------------- | -------------------------------- |
| 1-2 target files           | Typo fix, single function change |
| Single phase to completion | No research or test gen needed   |
| No agent coordination      | No dependency on other agents    |

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
| `/feature`  | Full feature lifecycle (explore + architect + implement + audit) |

### Quick Actions

| Command | Purpose                           |
| ------- | --------------------------------- |
| `/fix`  | Quick bug fixes (think→code→test) |

### Browser & Documentation

| Command | Purpose                          |
| ------- | -------------------------------- |
| `/e2e`  | E2E test from browser operations |
| `/adr`  | Architecture Decision Record     |
| `/docs` | Generate documentation from code |

### Git Operations

| Command    | Purpose                       |
| ---------- | ----------------------------- |
| `/branch`  | Suggest branch names          |
| `/commit`  | Conventional Commits messages |
| `/pr`      | PR descriptions               |
| `/issue`   | GitHub Issues                 |
| `/preview` | PR screening review           |

### Productivity

| Command            | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `/inbox`           | Task aggregation (GitHub/Slack/Calendar) |
| `/validate-config` | Configuration integrity check            |

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

| Command            | Primary Principles           | Secondary Principles                        |
| ------------------ | ---------------------------- | ------------------------------------------- |
| `/think`           | SOLID, Occam's Razor         | Progressive Enhancement                     |
| `/research`        | Strong Inference             | All principles for context                  |
| `/code`            | TDD, Baby Steps              | Readable Code, DRY, AI-Assisted Development |
| `/test`            | TDD                          | Law of Demeter, AI-Assisted Development     |
| `/fix`             | Occam's Razor                | TIDYINGS                                    |
| `/audit`           | All principles               | Priority order, Strong Inference            |
| `/feature`         | Progressive Enhancement      | TDD, SOLID, Occam's Razor                   |
| `/polish`          | Readable Code, Occam's Razor | DRY, YAGNI                                  |
| `/validate`        | Output Verifiability         | Completion criteria                         |
| `/commit`          | Readable Code                | Conventional Commits                        |
| `/branch`          | Readable Code                | Naming conventions                          |
| `/pr`              | Readable Code                | Documentation                               |
| `/issue`           | Readable Code                | Miller's Law                                |
| `/docs`            | Readable Code                | Progressive Enhancement                     |
| `/adr`             | SOLID                        | Leaky Abstraction                           |
| `/e2e`             | TDD                          | Progressive Enhancement                     |
| `/preview`         | Readable Code                | Strong Inference                            |
| `/inbox`           | -                            | -                                           |
| `/validate-config` | Output Verifiability         | Safety First                                |
