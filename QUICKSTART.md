# Quick Start (5 minutes)

## 1. Basic Commands

| Command     | When to Use              |
| ----------- | ------------------------ |
| `/fix`      | Small bugs, quick fixes  |
| `/code`     | New features with TDD    |
| `/research` | Investigate before doing |
| `/audit`    | Review code quality      |
| `/commit`   | Create commit message    |

## 2. Decision Flow

```text
Is it a quick fix? → /fix
Need to understand first? → /research → /fix
Building a feature? → /code → /audit
```

## 3. Example Session

```bash
# Quick bug fix
> /fix the login button is not working

# Feature development
> /research how does auth work in this codebase?
> /code add logout functionality
> /audit
> /commit
```

## 4. Key Principles

- **One command at a time**: Let each complete before the next
- **Trust the workflow**: Commands chain naturally
- **Ask when unclear**: Claude will clarify if needed

## 5. Next Steps

- See [WORKFLOW_REFERENCE.md](./rules/workflows/WORKFLOW_REFERENCE.md) for patterns
- Run `/help` for all commands
