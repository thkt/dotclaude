# GitHub CLI (gh)

GitHub operations from the command line.

## Authentication

```bash
gh auth status        # Check auth status
gh auth login         # Interactive login
```

## Pull Requests

### Create PR

```bash
# Basic
gh pr create --title "Title" --body "Description"

# With HEREDOC body
gh pr create --title "feat: add auth" --body "$(cat <<'EOF'
## Summary
- Add OAuth authentication
- Add session management

## Test Plan
- [ ] Manual testing
- [ ] Unit tests pass
EOF
)"

# Draft PR
gh pr create --draft --title "WIP: feature"

# Assign reviewers
gh pr create --reviewer username1,username2
```

### View & Manage PRs

| Command                 | Purpose            |
| ----------------------- | ------------------ |
| `gh pr list`            | List open PRs      |
| `gh pr view [number]`   | View PR details    |
| `gh pr status`          | Status of your PRs |
| `gh pr diff [number]`   | View PR diff       |
| `gh pr checks [number]` | View CI status     |
| `gh pr merge [number]`  | Merge PR           |

### Review PRs

```bash
gh pr review --approve
gh pr review --request-changes --body "Changes needed"
gh pr review --comment --body "LGTM"
```

## Issues

### Create Issue

```bash
gh issue create --title "Bug: login fails" --body "Description"

# With labels
gh issue create --title "Feature request" --label "enhancement"
```

### View & Manage Issues

| Command                   | Purpose              |
| ------------------------- | -------------------- |
| `gh issue list`           | List open issues     |
| `gh issue view [number]`  | View issue details   |
| `gh issue status`         | Your assigned issues |
| `gh issue close [number]` | Close issue          |

## Repository

| Command                    | Purpose           |
| -------------------------- | ----------------- |
| `gh repo view`             | View current repo |
| `gh repo clone owner/repo` | Clone repository  |
| `gh repo fork`             | Fork repository   |

## Workflows & Actions

| Command                | Purpose                |
| ---------------------- | ---------------------- |
| `gh workflow list`     | List workflows         |
| `gh run list`          | List workflow runs     |
| `gh run view [run-id]` | View run details       |
| `gh run watch`         | Watch running workflow |

## API Access

```bash
# Get PR comments
gh api repos/{owner}/{repo}/pulls/{number}/comments

# Get issue details
gh api repos/{owner}/{repo}/issues/{number}
```

## Best Practices

### 1. PR Template with HEREDOC

Always use HEREDOC for multi-line bodies to avoid shell escaping issues.

### 2. Check Before Merge

```bash
gh pr checks          # Wait for CI
gh pr view --json reviewDecision  # Check approvals
gh pr merge
```

### 3. Link Issues in PRs

```bash
gh pr create --title "fix: resolve login bug" --body "Fixes #123"
```

## Integration with Commands

- `/pr` uses `gh pr create` with HEREDOC body
- `/issue` uses `gh issue create` for structured issues
