---
name: utilizing-worktrees
description: >
  Git worktree management via wt CLI (claude-worktree).
  Use when user mentions worktree, ワークツリー, 並行開発, parallel branch,
  or wants to create/switch/list/remove worktrees.
allowed-tools:
  - Bash
  - Read
user-invocable: false
---

# Git Worktree Management (wt)

Manage git worktrees via the `wt` CLI for parallel development.

## Constraint

`wt cd` and `wt new` perform `cd` in a subshell, so the parent shell's directory does not change when called from Claude Code's Bash tool. Use `wt-core` directly to get the path, then use it in subsequent commands.

## Commands

### Create a worktree

```bash
# New branch from default base (main/develop/master)
wt-core new feature-auth

# New branch from specific base
wt-core new feature-auth develop

# Checkout existing branch
wt-core new existing-branch
```

Returns: worktree directory path (stdout). Auto-runs dependency install based on lockfiles.

### List worktrees

```bash
wt-core ls
```

Output: branch name, change count, ahead/behind, last commit message. `★` marks current directory.

### Get worktree path

```bash
wt-core cd feature-auth
```

Returns: worktree directory path (stdout).

### Remove a worktree

```bash
wt-core rm feature-auth
```

Refuses if uncommitted changes exist.

## Usage Patterns

| Intent                      | Command                                              |
| --------------------------- | ---------------------------------------------------- |
| Create and work in worktree | `path=$(wt-core new feat-x) && cd "$path" && pwd`    |
| Run command in worktree     | `path=$(wt-core cd feat-x) && git -C "$path" status` |
| List all worktrees          | `wt-core ls`                                         |
| Remove finished worktree    | `wt-core rm feat-x`                                  |

`cd` only persists within the same `&&` chain. Use `git -C "$path"` for cross-invocation commands.

## Directory Layout

```text
parent/
├── my-repo/                    # Main repository
└── worktrees/
    └── my-repo/
        ├── feature-auth/       # Worktree
        └── bugfix-123/         # Worktree
```

## Auto-detected Setup (on new)

| File                            | Command        |
| ------------------------------- | -------------- |
| `pnpm-lock.yaml`                | `pnpm install` |
| `package-lock.json`             | `npm install`  |
| `yarn.lock`                     | `yarn install` |
| `bun.lockb`                     | `bun install`  |
| `.mise.toml` / `.tool-versions` | `mise install` |
| `.envrc`                        | `direnv allow` |

Security: `direnv allow` auto-trusts `.envrc`. Verify contents before `wt-core new` in untrusted repos.

## Pitfalls

| Operation                                 | Risk                              | Solution                 |
| ----------------------------------------- | --------------------------------- | ------------------------ |
| `gh pr merge --delete-branch` in worktree | Deletes current worktree's branch | Run from main repository |
| `wt-core rm` while inside target worktree | Directory becomes invalid         | Exit worktree first      |
