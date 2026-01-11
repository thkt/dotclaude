# Conventional Commits

Standardized commit message format for semantic versioning and changelog generation.

## Format

```text
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## Commit Types

| Type       | Use Case                | Semantic |
| ---------- | ----------------------- | -------- |
| `feat`     | New feature             | MINOR    |
| `fix`      | Bug fix                 | PATCH    |
| `docs`     | Documentation           | -        |
| `style`    | Formatting              | -        |
| `refactor` | Code restructuring      | -        |
| `perf`     | Performance improvement | PATCH    |
| `test`     | Testing                 | -        |
| `chore`    | Maintenance             | -        |
| `ci`       | CI/CD changes           | -        |
| `build`    | Build system changes    | -        |

## Subject Line Rules

1. **Limit to 72 characters**
2. **Use imperative mood** ("add" not "added")
3. **Don't capitalize first letter after type**
4. **No period at the end**
5. **Be specific but concise**

## Examples

### Good

```text
feat(auth): add OAuth2 authentication support
fix(api): resolve timeout in user endpoint
docs(readme): update installation instructions
perf(search): optimize database queries
refactor(utils): extract validation to separate module
```

### Bad

```text
Fixed bug                          # no type, too vague
feat: Added new feature.           # capitalized, period
update code                        # no type, not specific
FEAT(AUTH): ADD LOGIN              # all caps
```

## Breaking Changes

Add `!` after type or `BREAKING CHANGE:` in footer:

```text
feat(api)!: remove deprecated endpoints

BREAKING CHANGE: The `/v1/users` endpoint has been removed.
Use `/v2/users` instead.
```

## Body Guidelines

- Wrap at 72 characters
- Explain "what" and "why", not "how"
- Reference issues: `Fixes #123` or `Closes #456`

## Multi-line Example

```text
fix(auth): prevent session hijacking vulnerability

The session token was being stored in localStorage which is
accessible to XSS attacks. Moved to httpOnly cookies.

Fixes #789
Security-Review: approved
```

## HEREDOC for Complex Messages

```bash
git commit -m "$(cat <<'EOF'
feat(workflow): implement automated test runner

Add auto-test command that runs tests and invokes /fix on failure.
Supports configurable max iterations and timeout.

Implements: AC-003
EOF
)"
```

## Related

- Branch naming: [@./branch-naming.md](./branch-naming.md)
- PR descriptions: [@./pr-descriptions.md](./pr-descriptions.md)
