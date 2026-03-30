# Worktree Bootstrap

Create an isolated git worktree and prepare it for Codex exec operations (build
and test execution, adversarial test generation).

## Procedure

Total timeout 300s (orchestrator-enforced). Any step failure or timeout exceeding 300s aborts with reason reported.

| Step | Action               | Timeout | On Failure                      |
| ---- | -------------------- | ------- | ------------------------------- |
| 1    | Create worktree      | 10s     | Abort bootstrap                 |
| 2    | Detect project type  | —       | Abort bootstrap                 |
| 3    | Install dependencies | 180s    | Abort bootstrap                 |
| 4    | Verify build         | 120s    | Abort (skip if no build script) |

### Step 1: Create Worktree

```bash
WORKTREE_BRANCH="verify-${SESSION_ID}"
WORKTREE_PATH=".claude/worktrees/verify-${SESSION_ID}"
git worktree add -b "$WORKTREE_BRANCH" "$WORKTREE_PATH" HEAD
```

If worktree path already exists, remove it first.

```bash
git worktree remove "$WORKTREE_PATH" --force 2>/dev/null
git branch -D "$WORKTREE_BRANCH" 2>/dev/null
```

### Step 2: Detect Project Type

| File             | Project Type | Dep Install Command     | Build Command   |
| ---------------- | ------------ | ----------------------- | --------------- |
| `package.json`   | Node.js      | See npm detection below | `npm run build` |
| `Cargo.toml`     | Rust         | `cargo fetch`           | `cargo build`   |
| `Makefile`       | Make         | (skip)                  | `make build`    |
| `Taskfile.yml`   | Task         | (skip)                  | `task build`    |
| `pyproject.toml` | Python       | `pip install -e .`      | (skip)          |
| `Gemfile`        | Ruby         | `bundle install`        | (skip)          |

Multiple matches: use first in table order.

#### npm Detection

| Lock File           | Command                          |
| ------------------- | -------------------------------- |
| `bun.lockb`         | `bun install --frozen-lockfile`  |
| `pnpm-lock.yaml`    | `pnpm install --frozen-lockfile` |
| `yarn.lock`         | `yarn install --frozen-lockfile` |
| `package-lock.json` | `npm ci`                         |
| (none)              | `npm install`                    |

### Step 3: Install Dependencies

Run the detected install command in the worktree directory. Capture stderr; non-zero exit aborts with error detail.

```bash
cd "$WORKTREE_PATH" && <install-command>
```

### Step 4: Verify Build

Run the detected build command. Skip if `package.json` has no `build` script. Non-zero exit aborts with last 30 lines of stderr.

```bash
cd "$WORKTREE_PATH" && <build-command>
```

## Cleanup

Always executed by orchestrator in finally block, regardless of verification outcome.

```bash
git worktree remove "$WORKTREE_PATH" --force
git branch -D "$WORKTREE_BRANCH"
```

## Error Reporting

```markdown
Bootstrap: failed
Reason: {step N failed: error detail}
Impact: Outcome verification and adversarial testing skipped. Static-only mode.
```
