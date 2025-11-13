---
description: >
  Analyze branch changes and generate comprehensive PR description automatically. Uses pr-generator agent.
  Examines all commits from branch divergence, not just latest. Creates summary, test plan, and checklist.
  Use when ready to create pull request and need description text.
  ブランチの変更内容を分析して包括的なPR説明文を自動生成。分岐点からのすべてのコミットを検査。
allowed-tools: Task
model: inherit
---

# /pr - Pull Request Description Generator

Analyze all changes in the current branch compared to the base branch and generate comprehensive PR descriptions.

**Implementation**: This command delegates to the specialized `pr-generator` subagent for optimal performance and context efficiency.

## How It Works

When invoked, this command:

1. Launches the `pr-generator` subagent via Task tool
2. Subagent detects base branch dynamically (main/master/develop)
3. Analyzes git diff, commit history, and file changes
4. Generates comprehensive PR descriptions
5. Returns multiple template alternatives

## Usage

### Basic Usage

```bash
/pr
```

Generates PR description from current branch changes.

### With Issue Reference

```bash
/pr "#456"
```

Links PR to specific issue.

### With Custom Context

```bash
/pr "This PR implements the new authentication flow discussed in the team meeting"
```

Incorporates additional context into the description.

## PR Description Structure

### Essential Sections

1. **Summary**: High-level overview
2. **Motivation**: Why these changes
3. **Changes**: Detailed breakdown
4. **Testing**: Verification steps
5. **Related**: Linked issues/PRs

### Optional Sections

- **Screenshots**: For UI changes
- **Breaking Changes**: For API modifications
- **Performance Impact**: For optimizations
- **Migration Guide**: For breaking changes

## Output Format

The command provides:

- **Branch analysis**: Current/base branches, commits, files, lines changed
- **Change summary**: Type, affected components, breaking changes, test coverage
- **Recommended template**: Comprehensive PR description
- **Alternative formats**: Detailed, concise, custom versions
- **Usage instructions**: How to create PR with description

## Integration with Workflow

Works seamlessly with:

- `/branch` - Create branch first
- `/commit` - Make commits
- `/pr` - Generate PR description
- `/review` - Code review after PR

## Technical Details

### Subagent Benefits

- **90% context reduction**: Only git operations, no codebase loading
- **2-3x faster execution**: Lightweight agent optimized for git analysis
- **Specialized logic**: Dedicated to PR description generation
- **Parallel execution**: Can run concurrently with other operations

### Git Operations Used

The subagent only executes git commands:

- `git symbolic-ref` - Detect base branch
- `git diff` - Compare branches
- `git log` - Analyze commits
- `git status` - Check current state
- No file system access or code parsing

### Base Branch Detection

The subagent automatically detects the base branch:

1. Attempts: `git symbolic-ref refs/remotes/origin/HEAD`
2. Falls back to: `main` → `master` → `develop`
3. Never assumes without verification

## Related Commands

- `/branch` - Generate branch names
- `/commit` - Generate commit messages
- `/review` - Code review

## Best Practices

1. **Create PR after commits**: Ensure all changes are committed
2. **Include context**: Provide motivation and goals
3. **Add testing steps**: Help reviewers verify
4. **Link issues**: Connect to relevant issues
5. **Review before submitting**: Check generated description

## Context Efficiency

This command is optimized for minimal context usage:

- ✅ No codebase files loaded
- ✅ Only git metadata analyzed
- ✅ Fast execution (<10 seconds)
- ✅ Can run in parallel with other tasks

## Smart Features

### Automatic Detection

- Issue numbers from commits/branch
- Change type (feature/fix/refactor)
- Breaking changes
- Test coverage
- Affected components

### Pattern Recognition

- API changes
- UI updates
- Database modifications
- Configuration changes
- Dependency updates

---

**Note**: For implementation details, see `.claude/agents/git/pr-generator.md`
