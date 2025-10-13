---
name: branch
description: Git差分を分析して適切なブランチ名を自動生成
priority: medium
suitable_for:
  type: [naming, git, workflow]
  phase: [planning, development]
  understanding: "≥ 70%"
aliases: [br, branch-name]
timeout: 10
allowed-tools: Task
context:
  changes_analyzed: "delegated"
  naming_convention: "feature/fix/chore/docs"
  file_patterns: "detected"
---

# /branch - Git Branch Name Generator

Analyze current Git changes and suggest appropriate branch names following conventional patterns.

**Implementation**: This command delegates to the specialized `branch-generator` subagent for optimal performance and context efficiency.

## How It Works

When invoked, this command:

1. Launches the `branch-generator` subagent via Task tool
2. Subagent analyzes git diff and status (no codebase context needed)
3. Generates conventional branch names
4. Returns multiple naming alternatives

## Usage

### Basic Usage

```bash
/branch
```

Analyzes current changes and suggests branch names.

### With Context

```bash
/branch "Adding user authentication with OAuth"
```

Incorporates description into suggestions.

### With Ticket

```bash
/branch "PROJ-456"
```

Includes ticket number in branch name.

## Branch Naming Conventions

### Type Prefixes

| Prefix | Use Case |
|--------|----------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `hotfix/` | Emergency fixes |
| `refactor/` | Code improvements |
| `docs/` | Documentation |
| `test/` | Test additions/fixes |
| `chore/` | Maintenance tasks |
| `perf/` | Performance improvements |
| `style/` | Formatting/styling |

### Format

```text
<type>/<scope>-<description>
<type>/<ticket>-<description>
<type>/<description>
```

### Good Examples

```bash
✅ feature/auth-add-oauth-support
✅ fix/api-resolve-timeout-issue
✅ docs/readme-update-install-steps
✅ feature/PROJ-123-user-search
```

### Bad Examples

```bash
❌ new-feature (no type prefix)
❌ feature/ADD_USER (uppercase)
❌ fix/bug (too vague)
❌ update_code (wrong separator)
```

## Output Format

The command provides:

- **Current status**: Current branch, files changed
- **Analysis**: Change type, primary scope, key changes
- **Recommended name**: Most appropriate based on analysis
- **Alternatives**: With scope, descriptive, concise versions
- **Usage instructions**: How to create or rename the branch

## Integration with Workflow

Works seamlessly with:

- `/commit` - Create branch first, then commit
- `/pr` - Generate PR description after branching
- `/think` - Planning before branching

## Technical Details

### Subagent Benefits

- **90% context reduction**: Only git operations, no codebase loading
- **2-3x faster execution**: Lightweight agent optimized for git analysis
- **Specialized logic**: Dedicated to branch name generation
- **Parallel execution**: Can run concurrently with other operations

### Git Operations Used

The subagent only executes git commands:

- `git branch --show-current` - Check current branch
- `git status` - Check file status
- `git diff` - Analyze changes
- No file system access or code parsing

## Related Commands

- `/commit` - Generate commit messages
- `/pr` - Create PR descriptions
- `/research` - Investigation before branching

## Best Practices

1. **Create branch early**: Before making changes
2. **Clear naming**: Be specific about changes
3. **Follow conventions**: Stick to project patterns
4. **Include tickets**: Link to issues when applicable
5. **Keep concise**: 50 characters or less

## Context Efficiency

This command is optimized for minimal context usage:

- ✅ No codebase files loaded
- ✅ Only git metadata analyzed
- ✅ Fast execution (<5 seconds)
- ✅ Can run in parallel with other tasks

---

**Note**: For implementation details, see `.claude/agents/git/branch-generator.md`
