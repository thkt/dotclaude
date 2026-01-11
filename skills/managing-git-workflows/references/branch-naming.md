# Branch Naming Convention

Patterns for consistent, meaningful branch names.

## Format

```text
<type>/<ticket>-<description>
```

### Examples

```text
feat/AUTH-123-oauth-login
fix/BUG-456-null-pointer
refactor/TECH-789-cleanup-utils
docs/DOC-101-api-reference
```

## Branch Types

| Type       | Purpose            | Example                |
| ---------- | ------------------ | ---------------------- |
| `feat`     | New feature        | feat/add-user-profile  |
| `fix`      | Bug fix            | fix/login-timeout      |
| `refactor` | Code restructuring | refactor/auth-module   |
| `docs`     | Documentation      | docs/api-guide         |
| `test`     | Test changes       | test/integration-suite |
| `chore`    | Maintenance        | chore/update-deps      |

## Naming Rules

### Do

- Use lowercase
- Use hyphens as word separators
- Keep description concise (2-4 words)
- Include ticket ID if available
- Be specific about the change

### Don't

- Use spaces or underscores
- Use CamelCase or PascalCase
- Make vague names like "update" or "fix-bug"
- Include dates (use ticket ID instead)

## Without Ticket System

```text
<type>/<short-description>

feat/oauth-integration
fix/memory-leak-in-cache
refactor/simplify-api-client
```

## Detection Logic

When generating branch name:

1. Analyze `git diff` for change type
2. Identify main affected component → scope
3. Extract key action from changes → description
4. Format: `type/scope-description`

## Related

- Commit messages: [@./commit-messages.md](./commit-messages.md)
