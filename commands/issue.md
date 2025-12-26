---
description: Generate GitHub Issue with structured title and body
allowed-tools: Task
model: inherit
dependencies: [issue-generator, utilizing-cli-tools]
---

# /issue - GitHub Issue Generator

Generate well-structured GitHub Issues with clear titles and comprehensive bodies.

**Implementation**: This command delegates to the specialized `issue-generator` subagent for optimal performance and context efficiency.

## How It Works

When invoked, this command:

1. Launches the `issue-generator` subagent via Task tool
2. Subagent analyzes the provided description
3. Generates structured issue title and body
4. Optionally creates the issue via `gh issue create`

## Usage

### Basic Usage

```bash
/issue "Login button not working on mobile"
```

Generates issue from description.

### With Type

```bash
/issue bug "API returns 500 on empty input"
/issue feature "Add dark mode support"
```

Specifies issue type explicitly.

### Create Directly

```bash
/issue --create "Database connection timeout"
```

Creates issue immediately via `gh` CLI.

## Issue Structure

### Title Format

```text
[type] Brief, specific description
```

Examples:

- `[Bug] Login fails on Safari mobile`
- `[Feature] Add export to CSV functionality`
- `[Docs] Update API authentication guide`

### Body Format

```markdown
## Description
[Clear problem statement or feature request]

## Steps to Reproduce (for bugs)
1. [Step 1]
2. [Step 2]
3. [Expected vs Actual]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Additional Context
[Screenshots, logs, related issues]
```

## Output Format

The command provides:

- **Issue Title**: Formatted with type prefix
- **Issue Body**: Structured markdown
- **Labels**: Suggested labels based on content
- **gh Command**: Ready-to-run command

## Integration with Workflow

Works seamlessly with:

- `/branch` - Create branch from issue
- `/commit` - Reference issue in commits
- `/pr` - Link PR to issue

## Related Commands

- `/branch` - Generate branch names
- `/commit` - Generate commit messages
- `/pr` - Create PR descriptions

## Context Efficiency

This command is optimized for minimal context usage:

- ✅ No codebase files loaded
- ✅ Only description analyzed
- ✅ Fast execution (<5 seconds)
- ✅ Can run in parallel with other tasks

---

**Note**: For implementation details, see `.claude/agents/git/issue-generator.md`
