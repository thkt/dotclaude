---
name: pr
description: ブランチの変更内容を分析して包括的なPR説明文を自動生成
priority: high
suitable_for:
  type: [git, workflow, documentation, review]
  phase: [pull-request, review]
  understanding: "≥ 70%"
aliases: [pull-request, pr-desc]
timeout: 15
allowed-tools: Bash(git diff*), Bash(git log*), Bash(git status*), Bash(git branch*), Bash(git remote*), Read, Grep
context:
  branch_comparison: "dynamic"
  commit_history: "analyzed"
  file_changes: "summarized"
  test_coverage: "checked"
---

# /pr - Pull Request Description Generator

## Purpose

Analyze all changes in the current branch compared to the base branch and generate comprehensive PR descriptions.

## Dynamic Context Analysis

**Important**: This command dynamically detects the base branch. Execute the following steps:

### Step 1: Detect Base Branch

First, attempt to detect the default base branch:

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
```

If this fails, try these fallbacks in order:

1. `main`
2. `master`
3. `develop`

Store the detected branch name as `BASE_BRANCH` for subsequent commands.

### Step 2: Current Branch Info

```bash
!`git branch --show-current`
```

### Step 3: Execute Analysis Commands

Once `BASE_BRANCH` is determined, execute the following analysis commands (replace `BASE_BRANCH` with the detected value):

#### Branch Comparison Summary

```bash
# Replace BASE_BRANCH with detected branch name
git diff BASE_BRANCH...HEAD --stat
```

#### Commit History

```bash
git log BASE_BRANCH..HEAD --oneline
```

#### Files Changed

```bash
git diff BASE_BRANCH...HEAD --name-only
```

#### Change Statistics

```bash
git diff BASE_BRANCH...HEAD --shortstat
```

## PR Description Generation Process

### 1. Change Analysis

#### Type Classification

Determine primary change type:

- **Feature**: New functionality added
- **Bug Fix**: Issues resolved
- **Refactor**: Code improvements
- **Performance**: Optimization changes
- **Documentation**: Doc updates
- **Chore**: Maintenance tasks

#### Impact Assessment

Execute these commands using the detected `BASE_BRANCH`:

```bash
# Check test file changes
git diff BASE_BRANCH...HEAD --name-only | grep -E "(test|spec)" | wc -l
```

```bash
# Check for breaking changes
git diff BASE_BRANCH...HEAD | grep -E "^-\s*(export|public|interface)" | head -5
```

```bash
# Count affected components
git diff BASE_BRANCH...HEAD --name-only | xargs -I {} dirname {} | sort -u | wc -l
```

### 2. Content Structure

Generate PR description with these sections:

1. **Summary**: High-level overview
2. **Problem/Motivation**: Why this change
3. **Solution**: What was implemented
4. **Changes**: Detailed breakdown
5. **Testing**: How to verify
6. **Screenshots**: If UI changes
7. **Checklist**: Review criteria
8. **Related**: Issues/PRs

## PR Description Templates

### Comprehensive Template

```markdown
## 📋 Pull Request Description

### Summary
[One paragraph overview of all changes]

### 🎯 Problem/Motivation
[Why these changes are needed]
- Issue: [Link to issue if applicable]
- Context: [Background information]
- Goal: [What we're trying to achieve]

### 💡 Solution
[How the problem was solved]
- Approach: [Implementation strategy]
- Key decisions: [Important choices made]
- Trade-offs: [Compromises if any]

### 📝 Changes

#### Core Changes
- [ ] [Main feature/fix implemented]
- [ ] [Secondary changes]
- [ ] [Additional improvements]

#### File Changes Summary
- **Added**: [New files created]
- **Modified**: [Files updated]
- **Removed**: [Files deleted]

#### Technical Details
```

[Code structure or architecture changes]

```markdown

### 🧪 Testing

#### How to Test
1. [Step-by-step testing instructions]
2. [Expected behavior]
3. [Edge cases to verify]

#### Test Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases tested

### 📸 Screenshots/Demo
[If applicable, add screenshots or GIFs]

#### Screenshots

**Before:**
[Image/description]

**After:**
[Image/description]

### ✅ Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Tests pass locally
- [ ] No linting errors
- [ ] Breaking changes documented

### 🔗 Related
- Closes #[issue number]
- Related to #[other issue/PR]
- Depends on #[dependency PR]

### 🏷️ Labels Suggested
- `[type]` (feature/bug/refactor)
- `[priority]` (high/medium/low)
- `[component]` (affected area)
- `[review]` (needs-review)
```

### Concise Template (for small changes)

```markdown
## Summary
[Brief description of changes]

## Changes
- [Key change 1]
- [Key change 2]
- [Key change 3]

## Testing
- [ ] Tests pass
- [ ] Manual testing done

## Related
- Fixes #[issue]
```

## Advanced Features

### Commit Grouping

Group commits by type using detected `BASE_BRANCH`:

```bash
# Features
git log BASE_BRANCH..HEAD --oneline | grep -E "^[a-f0-9]+ feat" | head -5
```

```bash
# Fixes
git log BASE_BRANCH..HEAD --oneline | grep -E "^[a-f0-9]+ fix" | head -5
```

### Dependency Changes

```bash
# Check package.json changes
git diff BASE_BRANCH...HEAD -- package.json | grep -E "^[+-]\s+\"" | head -10
```

### Performance Impact

```bash
# Check for performance-related changes
git diff BASE_BRANCH...HEAD | grep -E "(memo|cache|optimize|performance)" | head -5
```

## Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 PR Description Generator

## Branch Analysis
- **Current branch**: [branch name]
- **Base branch**: [target branch]
- **Commits**: [count]
- **Files changed**: [count]
- **Lines**: +[additions] -[deletions]

## Change Summary
- **Type**: [detected type]
- **Components affected**: [list]
- **Breaking changes**: [Yes/No]
- **Tests included**: [Yes/No]

## Generated PR Description

### 🎯 Recommended Template
[Full PR description formatted for GitHub]

### 📋 Alternative Formats

#### Detailed Version
[Comprehensive description with all sections]

#### Quick Version
[Concise description for small changes]

## Usage Instructions

### For GitHub Web
1. Copy the description above
2. Open PR creation page
3. Paste in description field

### For GitHub CLI
```bash
gh pr create --title "[PR Title]" --body "[PR Description]"
```

### For Git CLI

```bash
git push origin [branch-name]
# Then create PR via web interface
```

## Review Readiness

- ✅ All commits included
- ✅ Changes summarized
- ✅ Testing instructions provided
- ✅ Related issues linked
- ✅ Review checklist included

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```markdown

## Smart Detection Features

### Issue Reference Extraction

Automatically detect issue numbers from:
- Commit messages
- Branch names
- User input

### Change Pattern Recognition

Identify common patterns:
- **API Changes**: New endpoints, modified contracts
- **UI Updates**: Component changes, style updates
- **Database**: Schema changes, migrations
- **Config**: Environment, build configuration

### Review Complexity Estimation

Suggest review approach based on:
- Number of files changed
- Lines of code modified
- Number of components affected
- Presence of tests

## Integration Points

### With Other Commands

- Use after `/branch` and `/commit`
- Before requesting code review
- Complements `/review` command

### GitHub Integration

Works with:
- GitHub Issues
- GitHub Projects
- GitHub Actions
- Review assignments

## Best Practices

### For Reviewers

Highlight:
- **What to focus on**: Critical changes
- **What can be skipped**: Generated files, configs
- **Known issues**: TODOs, future improvements

### For Context

Include:
- **Before/After**: For UI changes
- **Performance metrics**: For optimizations
- **Error examples**: For bug fixes
- **API examples**: For new endpoints

## Example Usage

### Basic

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

## Quality Indicators

The command will indicate:

- **Completeness**: Are all necessary sections filled?
- **Clarity**: Is the description clear?
- **Testability**: Are test instructions adequate?
- **Reviewability**: Is it easy to review?
