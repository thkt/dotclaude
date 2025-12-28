<!--
Golden Master: Output - Commit Message

Selection criteria:
- Follows Conventional Commits specification
- Focuses on "why" rather than "what"
- Clear type, scope, and subject
- Appropriate body and footer usage

Features:
- 72 character subject limit
- Imperative mood
- Breaking change notation
- Issue reference format

Source: /commit command output

Last Reviewed: 2025-12-17
Update Reason: Initial creation
Previous Version: N/A
-->

# Commit Message - Expected Output Format

## Format Structure

```text
<type>(<scope>): <subject>

[optional body - wrapped at 72 characters]

[optional footer - breaking changes, issue references]
```

## Good Examples

### Feature with Body

```text
feat(auth): add OAuth2 authentication support

Implement OAuth2 flow with Google and GitHub providers.
This enables single sign-on for enterprise users and
reduces password management overhead.

Refs: #123
```

### Bug Fix (Simple)

```text
fix(api): resolve timeout in user endpoint

The query was missing an index on created_at column,
causing full table scans for date-range filters.
```

### Breaking Change

```text
feat(config)!: change configuration file format to YAML

BREAKING CHANGE: Configuration files must be migrated
from JSON to YAML format. Run `migrate-config` script
before upgrading.

Migration guide: docs/migration-v2.md
```

### Documentation

```text
docs(readme): update installation instructions

Add Docker-based setup option and clarify Node.js
version requirements (>=18.0.0).
```

### Refactoring

```text
refactor(hooks): extract validation logic to custom hook

Move form validation from components to useFormValidation
hook for better reusability and testing.
```

### Performance

```text
perf(search): optimize database queries

Add composite index on (user_id, created_at) and
implement cursor-based pagination. Reduces p99
latency from 2s to 200ms.
```

## Bad Examples (Anti-patterns)

```text
❌ Fixed bug
   → No type, too vague

❌ feat: Added new feature.
   → Capitalized subject, period at end, vague

❌ update code
   → No type, not specific

❌ FEAT(AUTH): ADD LOGIN
   → All caps

❌ feat(auth): add login feature that allows users to...
   → Too long (exceeds 72 characters)

❌ fix: fix
   → Redundant, no information
```

## Evaluation Criteria

| Aspect | Points | Criteria |
| --- | --- | --- |
| Type Accuracy | 25 | Correct type for the change |
| Subject Clarity | 25 | Specific, imperative, ≤72 chars |
| Body Quality | 25 | Explains "why", wrapped properly |
| Footer Completeness | 25 | Breaking changes noted, issues linked |

## Scope Examples

| Scope | Use Case |
| --- | --- |
| `auth` | Authentication/authorization |
| `api` | API endpoints |
| `ui` | User interface |
| `db` | Database changes |
| `config` | Configuration |
| `deps` | Dependencies |
| `ci` | CI/CD pipelines |
| `test` | Testing infrastructure |
