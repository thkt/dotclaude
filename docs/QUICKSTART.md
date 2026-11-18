# Quick Start (5 minutes)

## 1. Basic Commands

| Command      | When to Use                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `/scoping`   | Settle the requirements and done conditions of a feature or a bug into an agreed Issue |
| `/implement` | Implement an agreed Issue up to a draft PR                                   |

## 2. Decision Flow

```text
A feature or a bug → /scoping → /implement
```

## 3. Example Session

```bash
# Bug fix
> /scoping the login button is not working

# Feature development
> /scoping add logout functionality

# Hand over the agreed Issue's number to reach a draft PR
> /implement 123
```

## 4. Key Principles

- **One command at a time**: Let each complete before the next
- **Trust the workflow**: Commands chain naturally
- **Ask when unclear**: Claude will clarify if needed

## 5. Next Steps

- Run `/help` for all commands
- See [COMMANDS](./COMMANDS.md) for the full development flow
