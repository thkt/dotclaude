# Claude Commands Reference

Custom commands for systematic software development support.

## Available Commands

### Core Development

| Command     | Purpose                                  |
| ----------- | ---------------------------------------- |
| `/think`    | SOW creation with validation             |
| `/research` | Investigation without implementation     |
| `/code`     | TDD/RGRC implementation + IDR generation |
| `/test`     | Comprehensive testing                    |
| `/audit`    | Code review via agents + IDR update      |
| `/polish`   | Remove AI-generated slop + IDR update    |
| `/validate` | Validate SOW conformance + IDR reconcile |
| `/plans`    | List planning documents (SOW/Spec)       |
| `/spec`     | Generate Spec (implementation details)   |
| `/sow`      | Display SOW progress                     |

### Quick Actions

| Command   | Purpose                           |
| --------- | --------------------------------- |
| `/fix`    | Quick bug fixes (think→code→test) |
| `/rabbit` | CodeRabbit AI external review     |

### Automation

| Command       | Purpose                               |
| ------------- | ------------------------------------- |
| `/auto-test`  | Auto test runner with conditional fix |
| `/full-cycle` | Complete development cycle            |

### Browser & Documentation

| Command   | Purpose                          |
| --------- | -------------------------------- |
| `/e2e`    | E2E test from browser operations |
| `/adr`    | Architecture Decision Record     |
| `/rulify` | Generate project rule from ADR   |

### Git Operations

| Command   | Purpose                       |
| --------- | ----------------------------- |
| `/branch` | Suggest branch names          |
| `/commit` | Conventional Commits messages |
| `/pr`     | PR descriptions               |
| `/issue`  | GitHub Issues                 |

## Standard Workflows

```text
Feature: /research → /think → /code → /test → /audit → /validate
Bug Fix: /research → /fix
Simple:  /code → /test
```

**Plan Mode**: `Shift+Tab` for architecture decisions before implementation.

## IDR (Implementation Decision Record)

Auto-generated document tracking implementation through the lifecycle.

| Command     | IDR Action              |
| ----------- | ----------------------- |
| `/code`     | Creates with decisions  |
| `/audit`    | Appends review findings |
| `/polish`   | Appends simplifications |
| `/validate` | Reconciles with SOW AC  |

**Location**: `~/.claude/workspace/planning/[feature]/idr.md`

## Architecture

| Layer        | Role                         | Examples               |
| ------------ | ---------------------------- | ---------------------- |
| **Commands** | User workflows (`/command`)  | `/code`, `/audit`      |
| **Agents**   | Specialized analysis         | `audit-orchestrator`   |
| **Skills**   | Knowledge base, auto-trigger | `generating-tdd-tests` |

## Command Selection

| Situation            | Command                 | Reason              |
| -------------------- | ----------------------- | ------------------- |
| Small bug, clear fix | `/fix`                  | Quick iteration     |
| Unknown cause        | `/research` → `/fix`    | Investigate first   |
| New feature          | `/think` → `/code`      | Plan then implement |
| Complex architecture | Plan Mode (`Shift+Tab`) | Get approval first  |
| Code review needed   | `/audit`                | Agent-based review  |
| Before commit        | `/polish`               | Remove AI slop      |

## Related Files

- `~/.claude/CLAUDE.md` - Global settings
- `~/.claude/settings.json` - Tool permissions
