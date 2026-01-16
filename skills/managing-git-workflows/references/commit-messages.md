# Conventional Commits

## Format

```text
<type>(<scope>): <subject>
[optional body]
[optional footer]
```

## Types

| Type       | Use Case      | Semantic |
| ---------- | ------------- | -------- |
| `feat`     | New feature   | MINOR    |
| `fix`      | Bug fix       | PATCH    |
| `docs`     | Documentation | -        |
| `style`    | Formatting    | -        |
| `refactor` | Restructuring | -        |
| `perf`     | Performance   | PATCH    |
| `test`     | Testing       | -        |
| `chore`    | Maintenance   | -        |

## Subject Rules

| Rule                  | Example                          |
| --------------------- | -------------------------------- |
| Limit 72 chars        | ✓                                |
| Imperative mood       | "add" not "added"                |
| No capital after type | `feat: add` not `feat: Add`      |
| No period             | `feat: add X` not `feat: add X.` |

## Examples

```text
# Good
feat(auth): add OAuth2 authentication support
fix(api): resolve timeout in user endpoint

# Bad
Fixed bug          # no type, vague
feat: Added new.   # capital, period
```

## Breaking Changes

```text
feat(api)!: remove deprecated endpoints

BREAKING CHANGE: /v1/users removed. Use /v2/users.
```

## Body

- Wrap at 72 chars
- Explain "what" and "why"
- Reference: `Fixes #123`, `Closes #456`

## HEREDOC

```bash
git commit -m "$(cat <<'EOF'
feat(workflow): implement test runner

Multi-line description here.
EOF
)"
```
