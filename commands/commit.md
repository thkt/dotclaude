---
description: >
  Analyze Git diff and generate Conventional Commits format messages automatically. Uses commit-generator agent.
  Detects commit type (feat/fix/chore/docs), scope, breaking changes. Focuses on "why" rather than "what".
  Use after staging changes when ready to commit.
  Git差分を分析してConventional Commits形式のメッセージを自動生成。型、スコープ、破壊的変更を検出。
allowed-tools: Task
model: inherit
dependencies: [commit-generator]
---

# /commit - Git Commit Message Generator

Analyze staged changes and generate appropriate commit messages following Conventional Commits specification.

**Implementation**: This command delegates to the specialized `commit-generator` subagent for optimal performance and context efficiency.

## How It Works

When invoked, this command:

1. Launches the `commit-generator` subagent via Task tool
2. Subagent analyzes git diff and status (no codebase context needed)
3. Generates Conventional Commits format messages
4. Returns multiple message alternatives

## Usage

### Basic Usage

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

## Conventional Commits Format

```text
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Commit Types

| Type | Use Case |
|------|----------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Code restructuring |
| `perf` | Performance improvement |
| `test` | Testing |
| `chore` | Maintenance |
| `ci` | CI/CD changes |
| `build` | Build system changes |

### Subject Line Rules

1. **Limit to 72 characters**
2. **Use imperative mood** ("add" not "added")
3. **Don't capitalize first letter after type**
4. **No period at the end**
5. **Be specific but concise**

## Good Examples

```markdown
✅ feat(auth): add OAuth2 authentication support
✅ fix(api): resolve timeout in user endpoint
✅ docs(readme): update installation instructions
✅ perf(search): optimize database queries
```

## Bad Examples

```markdown
❌ Fixed bug (no type, too vague)
❌ feat: Added new feature. (capitalized, period)
❌ update code (no type, not specific)
❌ FEAT(AUTH): ADD LOGIN (all caps)
```

## Output Format

The command provides:

- **Analysis summary**: Files changed, lines added/deleted, detected type/scope
- **Recommended message**: Most appropriate based on analysis
- **Alternative formats**: Detailed, concise, with issue reference
- **Usage instructions**: How to commit with the generated message

## Integration with Workflow

Works seamlessly with:

- `/branch` - Create branch first
- `/pr` - Generate PR description after commits
- `/test` - Ensure tests pass before committing

## Technical Details

### Subagent Benefits

- **90% context reduction**: Only git operations, no codebase loading
- **2-3x faster execution**: Lightweight agent optimized for git analysis
- **Specialized logic**: Dedicated to commit message generation
- **Parallel execution**: Can run concurrently with other operations

### Git Operations Used

The subagent only executes git commands:

- `git diff --staged` - Analyze changes
- `git status` - Check file status
- `git log` - Learn commit style
- No file system access or code parsing

## Related Commands

- `/branch` - Generate branch names from changes
- `/pr` - Create PR descriptions
- `/audit` - Code review before committing

## Best Practices

1. **Stage related changes**: Group logically related changes
2. **Commit frequently**: Small, focused commits are better
3. **Review before committing**: Check the suggested message
4. **Include breaking changes**: Always note breaking changes
5. **Reference issues**: Link commits to issues when applicable

## Context Efficiency

This command is optimized for minimal context usage:

- ✅ No codebase files loaded
- ✅ Only git metadata analyzed
- ✅ Fast execution (<5 seconds)
- ✅ Can run in parallel with other tasks

---

**Note**: For implementation details, see `.claude/agents/git/commit-generator.md`
