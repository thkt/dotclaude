# Git Essentials

Core git operations for daily development workflow.

## Common Operations

### Staging & Committing

| Command | Purpose |
| --- | --- |
| `git add -A` | Stage all changes |
| `git add -p` | Interactive staging (select hunks) |
| `git commit -m "..."` | Commit with message |
| `git commit --amend` | Modify last commit (before push only!) |

### HEREDOC Commit (Recommended)

Avoid shell escaping issues with multi-line messages:

```bash
git commit -m "$(cat <<'EOF'
feat(component): add new Button component

- Add primary and secondary variants
- Add disabled state support
- Add loading spinner option
EOF
)"
```

### Branch Operations

| Command | Purpose |
| --- | --- |
| `git checkout -b feature/xxx` | Create and switch |
| `git push -u origin HEAD` | Push with tracking |
| `git branch -d feature/xxx` | Delete local branch |
| `git branch --show-current` | Show current branch |

### Inspection

| Command | Purpose |
| --- | --- |
| `git log --oneline -10` | Recent history |
| `git log --oneline --graph -20` | Visual history |
| `git diff --stat` | Summary of changes |
| `git diff --staged` | Staged changes |
| `git status --short` | Compact status |
| `git blame <file>` | Line-by-line history |

### Stashing

| Command | Purpose |
| --- | --- |
| `git stash` | Save work in progress |
| `git stash pop` | Restore and remove |
| `git stash list` | List stashes |
| `git stash show -p` | Show stash diff |

## Best Practices

### 1. Atomic Commits

One logical change per commit. If you need "and" in your message, split it.

### 2. Conventional Commits

```text
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`

### 3. Never Force Push to Main

```bash
# Bad: Dangerous
git push --force origin main

# Good: Safer alternative (only on feature branches)
git push --force-with-lease origin feature/xxx
```

### 4. Before Push Checklist

```bash
git status              # Check what's staged
git diff --staged       # Review changes
git log --oneline -3    # Verify commit history
```

## Dangerous Operations (Require Confirmation)

| Command | Risk | Safer Alternative |
| --- | --- | --- |
| `git push --force` | History rewrite | `git push --force-with-lease` |
| `git reset --hard` | Data loss | `git stash` first |
| `git clean -fd` | File deletion | `git clean -fdn` (dry-run first) |
| `git checkout -- .` | Discard changes | Verify with `git status` first |

## Recovery

### Undo Last Commit (Keep Changes)

```bash
git reset --soft HEAD~1
```

### Recover Deleted Branch

```bash
git reflog
git checkout -b recovered-branch <commit-hash>
```

### Discard Unstaged Changes

```bash
git checkout -- <file>  # Single file
git checkout -- .       # All files (dangerous!)
```

## Integration with Commands

- `/commit` uses HEREDOC format for commit messages
- `/branch` analyzes git status for branch naming
- `/pr` uses git log for PR description
