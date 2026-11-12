---
status: "accepted"
date: "2026-11-12"
decision-makers: thkt
---

# Let a stopped implement run resume without implementing again

## Context and Problem Statement

`workflows/implement.js` reuses no earlier branch or worktree, so a run that stops is started again from the implementation. On 2026-11-12 a bench run on `thkt/dotagents-workflow-trial` (Issue #165) implemented the same Issue four times before it reached draft PR #166. One of those stops was `capture-unavailable`, and one was `pr-body-mismatch` after the review had accepted the work. `history/implement-runs.jsonl` held 20 stops on that date, and 7 of them were `pr-body-mismatch`, `capture-unavailable`, `invalid-review` or `check-unavailable`: stops where the implementation was untouched and only a later part had to run again. The nested session got past the `pr-body-mismatch` by editing the prompt in a copy of the script and passing `resumeFromRunId`. Should the workflow offer that path itself, and from where may a run resume?

## Decision Drivers

- A stop caused by the environment should not cost a second implementation pass
- The script states that it re-confirms the Issue, the accepted tree, and the actor before the first write, and that it never retries a write. Both statements have to keep holding on a resumed run
- A result that comes back from cache describes the Issue, the worktree, and the actor as they were when the stopped run observed them
- A script has no clock and no randomness, so a resumed call needs a caller-supplied value to change its prompt
- An agent that edits the script to resume can also change a gate, and nothing checks that edit
- DR-0120 keeps the differences from Codex's implement few enough to re-sync by hand

## Considered Options

- A `retry` input that resumes from the start of a boundary: a verify round, or Ship (chosen)
- A `retry` input that resumes from the single step that stopped
- Leave resuming to the session, which edits a copy of the script
- Reuse the earlier branch and worktree on a fresh launch
- Keep starting again from the implementation

## Decision Outcome

Chosen option: "A `retry` input that resumes from the start of a boundary", because Workflow's `resumeFromRunId` already replays every agent call whose prompt is unchanged, and each boundary opens with an observation of the Issue and the tree, so everything that runs after the resume point is checked against the current state.

A run resumes from one of two boundaries. `round:N` is the start of verify round N: the observation of the Issue, the tree, and the config, then the capture, the check, and the review. `ship` is the start of Ship: the observation again, the actor and open-PR check, the commit, the PR body, and then the writes.

A stop returns `retry_next`. It is the object to pass as `retry` on the resume, or null when the stop cannot be resumed.

| Stop                                                                           | `retry_next` adds |
| ------------------------------------------------------------------------------ | ----------------- |
| `capture-unavailable`, `capture-timeout`, `check-unavailable`, `invalid-review` | `round:N`         |
| `pr-body-mismatch`                                                             | `ship`            |
| Every other stop                                                               | null              |

`retry` maps each boundary to how many times it has been run again, such as `{"round:1": 1, "ship": 2}`. The script appends one sentence carrying that count to the prompt of the observation that opens the boundary. That call and every call after it run, and the calls before it come back from cache. The count is in the sentence so that running the same boundary once more changes the prompt again. `retry_next` keeps the boundaries of earlier resumes: dropping one puts that boundary's prompt back as it was, and the run starts again from there. A key other than `round:N` or `ship`, or a count below 1, stops the run as `invalid-retry` before the start row is written.

Two steps had to tolerate a second run. A round that is run again captures into `<worktree>-capture-N-retry-<count>`, because the stopped capture left its directory and `mkdir` on that path fails. On a resumed Ship, the commit step skips `git commit` when nothing is staged and `HEAD^` is already the expected parent, because the stopped run had committed.

### Consequences

- Good, because a stop at the capture, the check, the review or the PR body costs one round or one Ship, where it cost a full implementation, check and review before
- Good, because no boundary lies between a write and its readback, so a resumed run cannot repeat a push, a PR creation, a body edit, an attachment or a CI wait
- Good, because a resumed Ship observes the Issue, the tree, the actor and the open PRs again before it writes, and stops as `requirements-changed`, `source-changed` or `actor-changed` when one of them moved
- Bad, because an `invalid-review` stop runs the capture and the check again before the review, where only the review had to run
- Bad, because the resume works only in the session that launched the run. Workflow keeps its cache per session
- Bad, because a stop for a human decision does not resume. Writing the decision into the Issue body changes the requirements, and the resumed run stops as `requirements-changed`. That was 9 of the 20 stops
- Bad, because a re-sync from Codex now has a fifth place to check by hand, next to the four DR-0120 lists
- Neutral, because one `run_id` can carry a stop row and a later terminal row in `implement-runs.jsonl`

### Confirmation

`workflows/implement/tests/implement.behavior.test.js` checks that each stop returns the `retry_next` above, that a later stop keeps the earlier boundaries and counts its own up, that a retry leaves every call before the boundary's observation unchanged, that a second resume carrying both boundaries runs from the second one, that a round run again captures into its own directory, and that anything other than a returned value stops as `invalid-retry`. The same file runs the resumed commit command against a real repository: it commits once, adds no commit on a second run, and fails when nothing is staged on the base. `skills/implement/tests/workflow-contract.test.js` checks that the skill passes `retry_next` back unchanged. A resume through a real `resumeFromRunId` had not been run when this record was written. The next bench run on `thkt/dotagents-workflow-trial` is where it gets exercised.

## Pros and Cons of the Options

### A `retry` input that resumes from the single step that stopped

Mark the prompt of the capture, the check, the review or the PR body step alone.

- Good, because an `invalid-review` stop runs the review alone
- Bad, because a resume from the PR body replays the Ship observation, the actor check, the open-PR check and the commit from cache, so the push follows without any of them being confirmed again. A review of the first version of this change found this
- Bad, because a resume from the check runs it on the current tree while the capture in the cache was taken for the tree the stopped run observed
- Bad, because a second resume from another step has to carry the first step's mark, which the single-step input could not express

### Leave resuming to the session, which edits a copy of the script

The session changes the prompt of the failed step in the persisted script and relaunches with `scriptPath` and `resumeFromRunId`.

- Good, because the script needs no change
- Good, because it worked once, on Issue #165
- Bad, because the same edit can change a stop condition or a limit, and no test covers a script the session wrote
- Bad, because where to resume from is left to the session's judgment, including the push

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

The steps a person follows are in `skills/implement/SKILL.md` § Resuming a run that stopped.

`invalid-capture` and `capture-media-ignored` return null. Their cause is in the capture definition or in `.gitignore`, both inside the worktree, and the skill tells the person not to edit the worktree of a run.

The script cannot tell which boundary the earlier run stopped at, so it accepts any well-formed `retry`. A `round:N` earlier than the stop runs the later rounds again, repairs included, on the current tree. A boundary the run never reaches changes no prompt, and the run returns the same stop from cache. The skill passes `retry_next` unchanged to keep both from happening.

The same bench run found that a capture directory left by an earlier run stops a fresh launch as `capture-unavailable`. This record does not change that path.

### Reassessment Triggers

- A resume through `resumeFromRunId` replays a call at or after a marked observation, or runs a call before it. The cache is then not keyed the way this record assumes
- A resumed run publishes work whose check or review result came from another tree, or publishes after the Issue or the actor changed
- The transport of the PR body stops going through an agent, at which point `pr-body-mismatch` has no cause left
- Workflow keeps its cache across sessions, which removes the same-session limit
- Codex's implement gains a resume of its own
