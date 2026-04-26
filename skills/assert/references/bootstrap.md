# Worktree Bootstrap

Create an isolated git worktree and prepare it for Codex exec operations (test execution, adversarial test generation). Bootstrap also runs a fast-fail build smoke test so that downstream parallel work is skipped early when the project is already broken.

## Procedure

Total timeout 300s (orchestrator-enforced). Any step failure or timeout exceeding 300s aborts with reason reported.

| Step | Action                  | Timeout | On Failure                                                   |
| ---- | ----------------------- | ------- | ------------------------------------------------------------ |
| 1    | Create worktree         | 10s     | Abort bootstrap                                              |
| 2    | Detect project type     | -       | Abort bootstrap                                              |
| 3    | Install dependencies    | 180s    | Abort bootstrap                                              |
| 4    | Build smoke test        | 120s    | Abort (skip if no build script). Captured for Phase 1c reuse |

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

### Step 4: Build Smoke Test

Run the detected build command as a fast-fail guard before launching Phase 1 / 2 parallel work. Skip if `package.json` has no `build` script (then Build = `skipped` in the Evidence table; that is environmental and routes to the caveat path).

Capture the result. Phase 1c reads it instead of re-running the build, so wall time is paid once.

```bash
cd "$WORKTREE_PATH" && <build-command>
```

Failure semantics (do not conflate with Step 1-3 environmental failures):

| Outcome                 | Build column | Phase 1c, 2a | Gate impact                                       |
| ----------------------- | ------------ | ------------ | ------------------------------------------------- |
| Exit 0 (pass)           | `pass`       | proceed      | Ready when issues=0, NotReady when issues>0       |
| Non-zero (build broken) | `fail`       | skipped      | NotReady (build fail blocks regardless of issues) |
| No build script         | `skipped`    | proceed      | Ready when issues=0, NotReady when issues>0       |

Step 4 fail is a verdict on the code (build is genuinely broken), not on the environment. It does NOT degrade to Ready (caveat). Step 1-3 failures are environmental and DO degrade to Ready (caveat) when issues=0.

## Cleanup

Always executed by orchestrator in finally block, regardless of assertion outcome.

```bash
git worktree remove "$WORKTREE_PATH" --force
git branch -D "$WORKTREE_BRANCH"
```

## Error Reporting

```markdown
Bootstrap: failed
Reason: {step N failed: error detail}
Impact: Outcome assertion and adversarial testing skipped. Static-only mode.
```
