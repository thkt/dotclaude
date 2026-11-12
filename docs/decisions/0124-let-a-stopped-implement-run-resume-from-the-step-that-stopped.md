---
status: "accepted"
date: "2026-11-12"
decision-makers: thkt
---

# Let a stopped implement run resume from the step that stopped

## Context and Problem Statement

`workflows/implement.js` reuses no earlier branch or worktree, so a run that stops is started again from the implementation. On 2026-11-12 a bench run on `thkt/dotagents-workflow-trial` (Issue #165) implemented the same Issue four times before it reached draft PR #166. One of those stops was `capture-unavailable`, and one was `pr-body-mismatch` after the review had accepted the work. `history/implement-runs.jsonl` held 20 stops on that date, and 7 of them were `pr-body-mismatch`, `capture-unavailable`, `invalid-review` or `check-unavailable`: stops where the implementation was untouched and only a later step had to run again. The nested session got past the `pr-body-mismatch` by editing the prompt in a copy of the script and passing `resumeFromRunId`. Should the workflow offer that path itself, and for which steps?

## Decision Drivers

- A stop caused by the environment should not cost a second implementation pass
- The script states that it never retries a write to GitHub, and that statement has to keep holding
- A script has no clock and no randomness, so a resumed step needs a caller-supplied value to change its prompt
- An agent that edits the script to resume can also change a gate, and nothing checks that edit
- DR-0120 keeps the differences from Codex's implement few enough to re-sync by hand

## Considered Options

- A `retry` input that marks the prompt of one named step, limited to steps that write nothing to GitHub (chosen)
- Leave resuming to the session, which edits a copy of the script
- Reuse the earlier branch and worktree on a fresh launch
- Keep starting again from the implementation

## Decision Outcome

Chosen option: "A `retry` input that marks the prompt of one named step", because Workflow's `resumeFromRunId` already replays every agent call whose prompt is unchanged, and marking one prompt is the smallest change that makes the run continue from that call without touching a gate.

A stop returns `retry_from`. It carries a step label when fixing the cause and running that step again is enough, and it is empty otherwise.

| Stop                                     | `retry_from`  |
| ---------------------------------------- | ------------- |
| `capture-unavailable`, `capture-timeout` | `capture:N`   |
| `check-unavailable` from the check       | `check:N`     |
| `invalid-review`                         | `review:N`    |
| `pr-body-mismatch`                       | `body`        |
| Every other stop                         | empty         |

The caller passes `retry: {from, attempt}` together with `resumeFromRunId`. The script appends one sentence carrying `attempt` to the prompt of the step named by `from`, so that call and every call after it run, and the calls before it come back from cache. `attempt` is in the sentence so that a second retry of the same step changes the prompt again. A retried capture writes to `<worktree>-capture-N-retry-<attempt>`, because the stopped capture left its directory and `mkdir` on that path fails. A `from` outside `capture:N`, `check:N`, `review:N` and `body` stops the run as `invalid-retry` before the start row is written.

### Consequences

- Good, because a stop at the capture, the check, the review or the PR body costs one step, where it cost a full implementation, check and review before
- Good, because the push, the PR creation, the body edit, the attachment and the CI wait cannot be named, so the script still never retries a write
- Bad, because the resume works only in the session that launched the run. Workflow keeps its cache per session
- Bad, because a stop for a human decision does not resume. Writing the decision into the Issue body changes the requirements, and the resumed run stops as `requirements-changed`. That was 9 of the 20 stops
- Bad, because a re-sync from Codex now has a fifth place to check by hand, next to the four DR-0120 lists
- Neutral, because one `run_id` can carry a stop row and a later terminal row in `implement-runs.jsonl`

### Confirmation

`workflows/implement/tests/implement.behavior.test.js` checks that each stop returns the label above, that a retry changes the prompt of the named step and of no step before it, that a second attempt changes it again, that a retried capture uses its own directory, and that a write step, `prepare`, `implement`, `repair:N` or a malformed attempt stops as `invalid-retry`. `skills/implement/tests/workflow-contract.test.js` checks that the skill passes `retry_from` back through the `retry` input. A resume through a real `resumeFromRunId` had not been run when this record was written. The next bench run on `thkt/dotagents-workflow-trial` is where it gets exercised.

## Pros and Cons of the Options

### Leave resuming to the session, which edits a copy of the script

The session changes the prompt of the failed step in the persisted script and relaunches with `scriptPath` and `resumeFromRunId`.

- Good, because the script needs no change
- Good, because it worked once, on Issue #165
- Bad, because the same edit can change a stop condition or a limit, and no test covers a script the session wrote
- Bad, because which step may be run again is left to the session's judgment, including the push

### Reuse the earlier branch and worktree on a fresh launch

A fresh launch that finds the branch and worktree continues on them, in place of stopping as `branch-exists`.

- Good, because it would also cover a stop for a human decision, where the requirements changed
- Good, because it works across sessions
- Bad, because the implementation agent would continue on a tree that an earlier agent left half-changed, against requirements that differ from the ones it was built for
- Bad, because Codex's implement stops on an existing branch, and reversing that is a larger difference than one input

### Keep starting again from the implementation

- Good, because every run starts from a known tree
- Bad, because 7 of 20 recorded stops repeated work whose result had not changed

## More Information

Extends DR-0120 (`docs/decisions/0120-keep-the-implement-workflows-deviations-from-codexs-implement.md`) with a fifth difference from Codex's implement, and does not supersede it. Codex's implement has no counterpart to the `retry` input.

The steps a person follows are in `skills/implement/SKILL.md` § Resuming from the step that stopped.

`check-unavailable` is also returned when a tree id cannot be read before or after a capture. Those two sites return an empty `retry_from`: the check label of that round does not exist yet, and the label of the round before it would run a review against media captured for an older tree.

`invalid-capture` and `capture-media-ignored` return an empty `retry_from`. Their cause is in the capture definition or in `.gitignore`, both inside the worktree, and a changed worktree no longer matches the cached check and review.

The same bench run found that a capture directory left by an earlier run stops a fresh launch as `capture-unavailable`. This record does not change that path.

### Reassessment Triggers

- A resume through `resumeFromRunId` replays a step that `retry` marked, or runs a step before it. The cache is then not keyed the way this record assumes
- A resumed run publishes work whose check or review result came from another tree
- The transport of the PR body stops going through an agent, at which point `pr-body-mismatch` and its `body` label have no cause left
- Workflow keeps its cache across sessions, which removes the same-session limit
- Codex's implement gains a resume of its own
