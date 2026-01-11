# Command Workflows

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

| Pattern       | Workflow                                                            | When                 |
| ------------- | ------------------------------------------------------------------- | -------------------- |
| Quick Fix     | `/fix`                                                              | Small bug, dev env   |
| Investigation | `/research` → `/fix`                                                | Unknown cause        |
| Feature       | `/research` → `/think` → `/code` → `/test` → `/audit` → `/validate` | New capability       |
| Simple        | `/code` → `/test`                                                   | Clear implementation |

**Plan Mode**: `Shift+Tab` for architecture decisions before implementation.

## Command Selection

| Criteria          | High Priority         | Medium Priority      | Low Priority        |
| ----------------- | --------------------- | -------------------- | ------------------- |
| **Understanding** | ≥95% → direct         | 70-94% → `/research` | <70% → clarify      |
| **Complexity**    | Multi-step → workflow | Single file → `/fix` | Unclear → `/think`  |
| **Urgency**       | Critical → `/fix`     | Normal → standard    | Planning → `/think` |

### Task Analysis

| User Intent        | Analysis            | Result                             |
| ------------------ | ------------------- | ---------------------------------- |
| "X is broken"      | Need investigation? | Yes → `/research` → `/fix`         |
| "Add Y feature"    | Multi-step?         | Yes → `/think` → `/code` → `/test` |
| "Site is down"     | Critical?           | Yes → `/fix` (urgent)              |
| "Fix typo"         | Simple & clear?     | Yes → `/fix`                       |
| "How does Z work?" | Investigation only  | `/research` (no implementation)    |

**Key Factors**:

- **Scope**: Single file vs multiple components
- **Context**: Known vs needs exploration
- **Risk**: Dev environment vs production

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

| Layer      | Role                              | Examples                                  |
| ---------- | --------------------------------- | ----------------------------------------- |
| **Skills** | User workflows and knowledge base | `/code`, `/audit`, `generating-tdd-tests` |
| **Agents** | Specialized analysis              | `audit-orchestrator`                      |

**Note**: As of v2.1.3, slash commands and skills are unified. Skills can be invoked via `/skill-name` and also auto-trigger based on keywords.

## Edge Cases

| Situation                 | Action                                                 |
| ------------------------- | ------------------------------------------------------ |
| Ambiguous intent          | Ask clarification in understanding check               |
| No command match          | Use `Command: N/A`, proceed with direct implementation |
| Multiple valid approaches | Present options for user choice                        |
| Unclear requirements      | Start with `/research`                                 |
| Complex multi-part        | Break into sub-workflows                               |

## Related Files

- `~/.claude/CLAUDE.md` - Global settings
- `~/.claude/settings.json` - Tool permissions
