---
name: commit
description: Git差分を分析してConventional Commits形式のメッセージを自動生成
priority: high
suitable_for:
  type: [git, workflow, documentation]
  phase: [development, commit]
  understanding: "≥ 75%"
aliases: [cm, commit-msg]
timeout: 10
allowed-tools: Bash(git diff*), Bash(git status*), Bash(git log*), Read, Grep
context:
  staged_changes: "analyzed"
  commit_format: "conventional"
  scope_detection: "automatic"
  breaking_changes: "detected"
---

# /commit - Git Commit Message Generator

## Purpose

Analyze staged changes and generate appropriate commit messages following Conventional Commits specification.

## Dynamic Context Analysis

### Staged Changes

```bash
!`git diff --staged --stat`
```

### Files to be Committed

```bash
!`git status --short`
```

### Detailed Diff Summary

```bash
`git diff --staged --numstat`
```

### Changed File Types

```bash
`git diff --staged --name-only`
```

### Recent Commit Style (for consistency)

```bash
!`git log --oneline -10`
```

## Commit Message Generation Process

### 1. Change Type Detection

Analyze changes to determine commit type:

| Type | Description | Trigger Patterns |
|------|-------------|------------------|
| `feat` | New feature | New files, new functions, new components |
| `fix` | Bug fix | Error handling, validation fixes, corrections |
| `docs` | Documentation | .md files, comments, README updates |
| `style` | Formatting | Whitespace, formatting, missing semi-colons |
| `refactor` | Code restructuring | Rename, move, extract functions |
| `perf` | Performance | Optimization, caching, algorithm improvements |
| `test` | Testing | Test files, test additions/modifications |
| `chore` | Maintenance | Dependencies, config, build scripts |
| `ci` | CI/CD | GitHub Actions, CI config files |
| `build` | Build system | Webpack, npm scripts, build tools |
| `revert` | Revert commit | Undoing previous changes |

### 2. Scope Detection

```bash
# Detect primary component/module
`git diff --staged --name-only`
```

```bash
# Check if breaking changes exist (major refactors)
`git diff --staged --stat`
```

### 3. Message Components

#### Subject Line Analysis

Generate concise subject based on:

- Main action performed
- Primary file/component affected
- User-facing impact

#### Body Generation (for complex changes)

For changes with 5+ files or 100+ lines:

- Explain motivation
- List key changes
- Note any breaking changes

#### Footer Elements

- Breaking changes: `BREAKING CHANGE: description`
- Issue references: `Closes #123`, `Fixes #456`
- Co-authors: `Co-authored-by: name <email>`

## Message Generation Templates

### Simple Changes

```markdown
## 📝 Commit Message Suggestions

### Primary Suggestion
```

```text
[type]([scope]): [description]

[optional body]

[optional footer]
```

### Example

```markdown
feat(auth): add OAuth2 authentication support

- Implement Google OAuth provider
- Add token refresh mechanism
- Update user model with OAuth fields

Closes #234
```

### Complex Changes

```markdown
## 📝 Commit Message for Complex Changes

### Structured Format
```

```text
[type]([scope]): [short description]

[Motivation/Context]
[What changed]
[Why this approach]

[Breaking changes if any]
[Issue references]
```

### Example

```markdown
refactor(api): restructure service layer architecture

Motivation:
Previous service layer had circular dependencies and tight coupling
between modules, making testing and maintenance difficult.

Changes:

- Extract interfaces for all services
- Implement dependency injection
- Separate business logic from data access
- Add service factory pattern

This approach improves testability and allows for easier mocking
in unit tests while maintaining backward compatibility.

BREAKING CHANGE: Service constructors now require explicit dependencies
Closes #456, #457
```

## Advanced Analysis

### Breaking Change Detection

```bash
# Check for removed exports/functions
`git diff --staged`
```

```bash
# Check for API changes
`git diff --staged`
```

### Test Coverage Check

```bash
# Check if tests were updated with code
`git diff --staged --name-only`
```

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Commit Message Generator

## Analysis Summary
- **Files changed**: [count]
- **Insertions**: +[additions]
- **Deletions**: -[deletions]
- **Primary scope**: [detected scope]
- **Change type**: [detected type]

## Suggested Commit Messages

### 🎯 Recommended (Conventional Commits)

```text
[generated message]
```

### 📋 Alternatives

#### Detailed Version

```text
[longer format with body]
```

#### Simple Version

```text
[concise one-liner]
```

#### With Issue Reference

```text
[message with issue number]
```

## Usage

To commit with the recommended message:

```bash
git commit -m "[subject]" -m "[body]"
```

Or use interactive mode:

```bash
git commit
# Then paste the full message in your editor
```

## Checklist

- ✅ Type prefix is appropriate
- ✅ Scope accurately reflects changes
- ✅ Description is clear and concise
- ✅ Breaking changes noted (if any)
- ✅ Issue references included (if applicable)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```markdown

## Convention Guidelines

### Subject Line Rules

1. **Limit to 72 characters**
2. **Use imperative mood** ("add" not "added" or "adds")
3. **Don't capitalize first letter after type**
4. **No period at the end**
5. **Be specific but concise**

### Good Examples

- ✅ `feat(auth): add password reset functionality`
- ✅ `fix(api): resolve timeout in user endpoint`
- ✅ `docs(readme): update installation instructions`
- ✅ `perf(search): optimize database queries`

### Bad Examples

- ❌ `Fixed bug` (no type, too vague)
- ❌ `feat: Added new feature.` (capitalized, period)
- ❌ `update code` (no type, not specific)
- ❌ `FEAT(AUTH): ADD LOGIN` (all caps)

## Smart Features

### Multi-Language Detection

Detects primary language of changes:

```bash
`git diff --staged --name-only`
```

### Emoji Support (Optional)

If project uses gitmoji:

```markdown
## With Emoji Enhancement
- ✨ feat: `✨ Add new feature`
- 🐛 fix: `🐛 Fix bug`
- 📚 docs: `📚 Update documentation`
- ♻️ refactor: `♻️ Refactor code`
- 🎨 style: `🎨 Improve formatting`
```

### Co-author Detection

If pair programming or collaboration:

```markdown
## Co-authorship
Detected multiple contributors. Add to commit:

```text
Co-authored-by: Name <email@example.com>
```

```markdown

## Integration with Workflow

Works seamlessly with:

- `/branch` - Create branch first
- `/pr` - Generate PR description after commits
- `/test` - Ensure tests pass before committing

## Context-Aware Suggestions

### For Bug Fixes

Emphasizes:

- What was broken
- How it was fixed
- Impact on users

### For Features

Highlights:

- New capabilities
- User benefits
- Implementation approach

### For Refactoring

Explains:

- Why refactoring was needed
- What improved
- Backward compatibility

## Example Usage

### Basic

```bash
/commit
```

Analyzes staged changes and suggests messages.

### With Context

```bash
/commit "Related to authentication flow"
```

Incorporates context into message generation.

### With Issue Number

```bash
/commit "#123"
```

Includes issue reference in commit message.
