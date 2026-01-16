# Branch Naming

## Format

```text
<type>/<ticket>-<description>
# or without ticket
<type>/<description>
```

## Types

| Type       | Purpose            | Example                    |
| ---------- | ------------------ | -------------------------- |
| `feat`     | New feature        | feat/AUTH-123-oauth-login  |
| `fix`      | Bug fix            | fix/BUG-456-null-pointer   |
| `refactor` | Code restructuring | refactor/TECH-789-cleanup  |
| `docs`     | Documentation      | docs/DOC-101-api-reference |
| `test`     | Test changes       | test/integration-suite     |
| `chore`    | Maintenance        | chore/update-deps          |

## Rules

| Do                        | Don't                       |
| ------------------------- | --------------------------- |
| Use lowercase             | Use spaces/underscores      |
| Use hyphens as separators | Use CamelCase/PascalCase    |
| Keep concise (2-4 words)  | Make vague names ("update") |
| Include ticket ID         | Include dates               |

## Detection Logic

1. Analyze `git diff` → type
2. Identify affected component → scope
3. Extract key action → description
4. Format: `type/scope-description`
