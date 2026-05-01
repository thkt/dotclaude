---
paths:
  - ".claude/skills/**"
---

# Workflows

## Command Selection

| Situation                         | Workflow                                                     |
| --------------------------------- | ------------------------------------------------------------ |
| Small bug, stable codebase        | `/fix`                                                       |
| Known implementation              | `/code`                                                      |
| Unknown cause / missing knowledge | `/research` → `/fix`                                         |
| Design or approach unresolved     | `/think`                                                     |
| New capability                    | `/feature` (or: `/research` → `/think` → `/code` → `/audit`) |
| Urgent production issue           | `/fix` (urgent, skip design)                                 |

## Team-First Principle

Default: Team (TeamCreate + TaskList for progress tracking)

| Command     | Mode | Notes                         |
| ----------- | ---- | ----------------------------- |
| `/feature`  | Team | Existing team structure       |
| `/audit`    | Auto | Scope-based decision          |
| `/think`    | Solo |                               |
| `/code`     | Auto | Scope-based decision          |
| `/fix`      | Auto | Solo conditions below         |
| `/research` | Solo |                               |
| Utility     | Solo | /commit, /checkout, /pr, etc. |

Auto: All solo conditions met → Solo, otherwise → Team

| Solo Condition             | Example                          |
| -------------------------- | -------------------------------- |
| 1-2 target files           | Typo fix, single function change |
| Single phase to completion | No research or test gen needed   |
| No agent coordination      | No dependency on other agents    |

## Available Commands

| Command     | Category      | Purpose                                                          |
| ----------- | ------------- | ---------------------------------------------------------------- |
| `/think`    | Core          | SOW creation with validation                                     |
| `/research` | Core          | Investigation without implementation                             |
| `/code`     | Core          | TDD/RGRC implementation                                          |
| `/audit`    | Core          | Code review via agents                                           |
| `/polish`   | Core          | Remove AI-generated slop                                         |
| `/feature`  | Core          | Full feature lifecycle (explore + architect + implement + audit) |
| `/fix`      | Quick         | Quick bug fixes (think→code→test)                                |
| `/adr`      | Documentation | Architecture Decision Record                                     |
| `/checkout` | Git           | Suggest branch names                                             |
| `/commit`   | Git           | Conventional Commits messages                                    |
| `/pr`       | Git           | PR descriptions                                                  |
| `/issue`    | Git           | GitHub Issues                                                    |
| `/preview`  | Git           | PR screening review                                              |

## Todo Progress Tracking

Cross-session: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"`

| Command     | Todo Action                                        |
| ----------- | -------------------------------------------------- |
| `/think`    | TaskCreate from Implementation Plan                |
| `/code`     | TaskUpdate → in_progress / completed               |
| `/audit`    | (via `/code` phase)                                |
| `/feature`  | TaskCreate (Phase 1), TaskUpdate throughout phases |
