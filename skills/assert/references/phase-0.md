# Phase 0: Worktree Bootstrap

Create and prepare an isolated git worktree for Codex exec operations (test execution, adversarial test generation). The orchestrator creates the worktree (0a), then runs `${CLAUDE_SKILL_DIR}/scripts/bootstrap.py` in the background and reads the detect / install / build smoke test JSON verdict (0b).

## 0a. Create Worktree

```bash
"${CLAUDE_SKILL_DIR}/scripts/worktree.py" "${SESSION_ID}"
```

Removes any stale worktree and branch, then creates a fresh one from HEAD, and returns JSON {branch, path, status}. The orchestrator passes `path` to 0b onward and to Cleanup. On status=error, abort bootstrap as an environmental failure.

## 0b. Detect, Install, Build

```bash
"${CLAUDE_SKILL_DIR}/scripts/bootstrap.py" "<path from 0a>"
```

The script prints one JSON object. The fields below are what the orchestrator reads.

| Field        | Values                   | Meaning                                                       |
| ------------ | ------------------------ | ------------------------------------------------------------- |
| project_type | node / rust / make / ... | null when no marker file is present                           |
| install      | ok / fail / skip         | skip = the project type has no dependency step                |
| build        | pass / fail / skipped    | skipped = no build concept, or env failure upstream           |
| reason       | string                   | env:install-_, build-_, no-build-script, project-type-unknown |

## Gate Routing

The Build result is determined by (install, build) jointly and expressed as one of three values, `pass` / `fail` / `skipped`. A build timeout that fires after the build started is reported as `build = fail`. The final gate decision for the caveat path is owned by `${CLAUDE_SKILL_DIR}/references/phase-4.md` § Bootstrap Failure Handling.

| install   | build   | Meaning            | Build column | Phase 1c, 2a         |
| --------- | ------- | ------------------ | ------------ | -------------------- |
| ok / skip | pass    | clean              | `pass`       | proceed              |
| ok / skip | skipped | no build concept   | `skipped`    | proceed              |
| ok        | fail    | build smoke broken | `fail`       | skipped              |
| fail      | skipped | env failure        | `skipped`    | skipped, caveat path |

## Cleanup

Wrap all phases in try / finally to guarantee cleanup regardless of outcome.

```bash
"${CLAUDE_SKILL_DIR}/scripts/worktree.py" --cleanup "${SESSION_ID}"
```

## Error Reporting

```markdown
Bootstrap: failed
Reason: {reason field from bootstrap.py JSON}
Impact: Outcome assertion and adversarial testing skipped. Static-only mode.
```
