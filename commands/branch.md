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
allowed-tools: Bash(git diff*), Bash(git status*), Bash(git log*), Bash(git branch*), Read, Grep
context:
  changes_analyzed: "dynamic"
  naming_convention: "feature/fix/chore/docs"
  file_patterns: "detected"
---

# /branch - Git Branch Name Generator

## Purpose

Analyze current Git changes and suggest appropriate branch names following conventional patterns.

## Dynamic Context Analysis

### Current Branch Status

```bash
!`git branch --show-current`
```

### Uncommitted Changes

```bash
!`git status --short`
```

### Staged Changes Summary

```bash
!`git diff --staged --stat`
```

### Modified Files

```bash
!`git diff --name-only HEAD`
```

### Recent Commits (for context)

```bash
!`git log --oneline -5`
```

## Branch Name Generation Process

### 1. Change Analysis

Analyze the Git changes to determine:

1. **Change Type Detection**:
   - New feature (`feature/`)
   - Bug fix (`fix/`)
   - Refactoring (`refactor/`)
   - Documentation (`docs/`)
   - Chore/maintenance (`chore/`)
   - Performance (`perf/`)

2. **Scope Identification**:
   - Component/module affected
   - Primary functionality changed
   - File pattern analysis

3. **Description Generation**:
   - Concise but descriptive
   - Use kebab-case
   - Include ticket number if mentioned

### 2. Pattern Detection

```bash
# Analyze file patterns
!`git diff --name-only | head -10 | xargs -I {} basename {} | cut -d. -f1 | sort -u`
```

```bash
# Check for test changes
!`git diff --name-only | grep -E "(test|spec)" | wc -l`
```

```bash
# Detect documentation changes
!`git diff --name-only | grep -E "\.(md|txt|doc)" | wc -l`
```

### 3. Branch Name Suggestions

Generate multiple suggestions based on:

```markdown
## 🌿 Branch Name Suggestions

Based on your changes, here are recommended branch names:

### Primary Suggestion
`[type]/[scope]-[description]`
- **Type**: [detected type]
- **Scope**: [main component/area]
- **Description**: [what it does]
- **Example**: `feature/auth-add-oauth-support`

### Alternative Suggestions
1. `[type]/[ticket]-[description]` (if ticket number provided)
2. `[type]/[date]-[description]` (for time-sensitive work)
3. `[type]/[author]-[description]` (for personal branches)

### Conventions Applied
- ✅ Lowercase only
- ✅ Kebab-case for multi-word descriptions
- ✅ Clear type prefix
- ✅ Descriptive but concise
```

## Naming Conventions

### Type Prefixes

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New functionality | `feature/user-profile-page` |
| `fix/` | Bug fixes | `fix/login-validation-error` |
| `hotfix/` | Emergency fixes | `hotfix/payment-gateway-timeout` |
| `refactor/` | Code improvements | `refactor/auth-service-cleanup` |
| `docs/` | Documentation | `docs/api-usage-guide` |
| `test/` | Test additions/fixes | `test/user-service-coverage` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |
| `perf/` | Performance improvements | `perf/query-optimization` |
| `style/` | Formatting/styling | `style/button-consistency` |

### Scope Guidelines

- Use singular nouns when possible
- Focus on the primary area of change
- Keep it to 1-2 words maximum
- Examples: `auth`, `user`, `api`, `ui`, `db`

### Description Best Practices

- Start with a verb when applicable
- Be specific but concise
- Avoid redundant words
- Max 3-4 words

## Advanced Features

### Ticket Integration

If user input contains ticket reference (e.g., JIRA-123):

```markdown
## Ticket-based Naming
Detected ticket: [TICKET-ID]
Suggested: `[type]/[TICKET-ID]-[brief-description]`
Example: `feature/PROJ-123-add-user-search`
```

### Multi-Component Changes

For changes spanning multiple areas:

```markdown
## Multi-Component Branch
Primary scope: [main area]
Secondary scopes: [other areas]
Suggested: `[type]/[primary]-with-[secondary]`
Example: `feature/auth-with-ui-updates`
```

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌿 Branch Name Generator

## Current Status
- Current branch: [branch name]
- Files changed: [count]
- Lines added/removed: +[additions] -[deletions]

## Analysis
- **Change Type**: [detected type]
- **Primary Scope**: [main component]
- **Key Changes**: [brief summary]

## Recommended Branch Names

### 🎯 Primary Recommendation
`[generated-branch-name]`

### 📝 Alternatives
1. `[alternative-1]` - [why this option]
2. `[alternative-2]` - [why this option]
3. `[alternative-3]` - [why this option]

## Usage
To create the branch:
```bash
git checkout -b [recommended-name]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```markdown

## Example Usage

### Basic Usage

```

/branch

```markdown

Analyzes current changes and suggests branch names.

### With Context

```

/branch "Adding user authentication with OAuth"

```markdown

Incorporates description into suggestions.

### With Ticket

```

/branch "PROJ-456"

```markdown

Includes ticket number in branch name.

## Integration with Workflow

This command works well with:
- `/commit` - After creating branch, generate commit message
- `/pr` - When ready, generate PR description
- `/think` - For planning before branching

## Decision Factors

The command considers:

1. **File Types Changed**:
   - `.tsx/.ts` → feature/fix
   - `.md` → docs
   - `test.ts` → test
   - `package.json` → chore

2. **Change Volume**:
   - Small changes → specific names
   - Large changes → broader scope names

3. **Existing Patterns**:
   - Analyzes recent branch names for consistency
   - Follows project conventions if detectable
