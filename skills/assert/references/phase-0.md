# Phase 0: Worktree Bootstrap

Create an isolated git worktree and prepare it for Codex exec operations (test execution, adversarial test generation). Bootstrap also runs a fast-fail build smoke test so that downstream parallel work is skipped early when the project is already broken.

## Procedure

Total timeout 300s (orchestrator-enforced). Any step failure or timeout exceeding 300s aborts with reason reported.

| Step | Action               | Timeout | On Failure                                                   |
| ---- | -------------------- | ------- | ------------------------------------------------------------ |
| 1    | Create worktree      | 10s     | Abort bootstrap                                              |
| 2    | Detect project type  | -       | Abort bootstrap                                              |
| 3    | Install dependencies | 180s    | Abort bootstrap                                              |
| 4    | Build smoke test     | 120s    | Abort (skip if no build script). Captured for Phase 1c reuse |

### Step 1: Create Worktree

```bash
WORKTREE_BRANCH="assert-${SESSION_ID}"
WORKTREE_PATH=".claude/worktrees/assert-${SESSION_ID}"
git worktree add -b "$WORKTREE_BRANCH" "$WORKTREE_PATH" HEAD
```

If worktree path already exists, remove it first.

```bash
git worktree remove "$WORKTREE_PATH" --force 2>/dev/null
git branch -D "$WORKTREE_BRANCH" 2>/dev/null
```

### Step 2: Detect Project Type

When multiple files match, use the first match in table order.

| File             | Project Type | Dep Install Command     | Build Command   |
| ---------------- | ------------ | ----------------------- | --------------- |
| `package.json`   | Node.js      | See npm detection below | `npm run build` |
| `Cargo.toml`     | Rust         | `cargo fetch`           | `cargo build`   |
| `Makefile`       | Make         | skip                    | `make build`    |
| `Taskfile.yml`   | Task         | skip                    | `task build`    |
| `pyproject.toml` | Python       | `pip install -e .`      | skip            |
| `Gemfile`        | Ruby         | `bundle install`        | skip            |

#### npm Detection

| Lock File           | Command                          |
| ------------------- | -------------------------------- |
| `bun.lockb`         | `bun install --frozen-lockfile`  |
| `pnpm-lock.yaml`    | `pnpm install --frozen-lockfile` |
| `yarn.lock`         | `yarn install --frozen-lockfile` |
| `package-lock.json` | `npm ci`                         |
| none                | `npm install`                    |

### Step 3: Install Dependencies

Run the detected install command in the worktree directory. Capture stderr; non-zero exit aborts with error detail.

```bash
cd "$WORKTREE_PATH" && <install-command>
```

### Step 4: Build smoke test

Run the detected build command as a fast-fail guard before launching Phase 1 / 2 parallel work. If `package.json` has no `build` script, treat it as a project without a build concept, skip it, set the Build column to `skipped` in the Evidence table, and route to the caveat path.

To run the build only once, record the result and reuse it in Phase 1c.

```bash
cd "$WORKTREE_PATH" && <build-command>
```

Step 4 failure means something different from a Step 1-3 environmental failure. A hanging build is indistinguishable from a broken one; treating it as environmental would let it reach Ready (caveat), so a timeout firing after Step 4 has started is also treated as fail.

| Outcome                       | Build column | Phase 1c, 2a |
| ----------------------------- | ------------ | ------------ |
| Exit 0 (pass)                 | `pass`       | proceed      |
| Non-zero (build broken)       | `fail`       | skipped      |
| Timeout (120s / overall 300s) | `fail`       | skipped      |
| No build script               | `skipped`    | proceed      |

## Cleanup

Wrap all phases in try / finally to guarantee cleanup regardless of outcome.

```bash
git worktree remove <worktree-path> --force
git branch -D assert-<session-id>
```

## Error Reporting

```markdown
Bootstrap: failed
Reason: {step N failed: error detail}
Impact: Outcome assertion and adversarial testing skipped. Static-only mode.
```
