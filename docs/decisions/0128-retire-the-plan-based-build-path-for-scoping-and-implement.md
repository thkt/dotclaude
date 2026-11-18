---
status: "accepted"
date: "2026-11-18"
decision-makers: thkt
scope: [meta, skills, workflows]
---

# Retire the plan-based build path for scoping and implement

## Context and Problem Statement

`thkt/dotclaude` carries two paths from a request to a pull request. The plan-based path runs `/think`, `/issue`, `/qualify`, then the build workflow (`workflows/build.js` nesting `workflows/code.js`), with `/preview` matching the PR against the plan. The agreement-based path runs `/scoping`, then `/implement` (`workflows/implement.js`, DR-0120, DR-0127).

Both paths are maintained: a change to how an Issue is written, how a check runs, or how a PR body is built has to hold on each. The build workflow stopped 30 times in 131 launches since 2026-08-21, and 16 of those stops came from the shape of the `## Plan` section (`invalid-plan` 8, `plan-drift` 3, `extraction-mismatch` 3, `oversized-unit` 2). Which path stays had to be decided.

## Decision Drivers

- `.claude/OUTCOME.md` asks that quality assurance sit in deterministic layers, so the path that stays must keep its checks in script. The per-unit Red is the one check this decision gives up, and Consequences names it
- The pull request has to meet every acceptance item of the Issue it came from
- One path to maintain, so a rule about Issues or PR bodies is written once
- A repository already using a path must be able to move without losing a working route

## Considered Options

- Retire the plan-based path and keep `/scoping` then `/implement` (chosen)
- Keep both paths and choose per task
- Keep the plan-based path and retire `/scoping` and `/implement`

## Decision Outcome

Chosen option: "Retire the plan-based path and keep `/scoping` then `/implement`", because on the same two tasks the agreement-based path met every acceptance item and its tests caught more injected defects, while the plan-based path missed one item on each task.

The plan-based path was stronger on one point in task 1. It handled a character whose length changes on case folding, which the agreement-based path did in 2 of 9 runs. `/scoping` now writes the behavior outside a premise the Issue states (PR #787), which closed that gap.

| Measure | Plan-based | Agreement-based |
| --- | --- | --- |
| Acceptance items met, task 1 (search-term highlight) | 4 of 5 in both of 2 runs | 5 of 5 in all 9 runs |
| Acceptance items met, task 2 (sort by product code) | 4 of 5 in the 1 run that reached a PR; the other stopped `red-failed` | 5 of 5 in both runs |
| Injected defects the tests caught, of 15 | 10 and 11 (task 1), 11 (task 2) | 12 to 15 (task 1), 12 and 14 (task 2) |
| Cost per run, task 1 | $5.22 and $6.16 | $10.97 |
| Wall time, task 1 | 14.6 and 23.1 min | 22.6 min |
| Decisions a human made during the run | 0 | 1 to 2 |

### Consequences

- Good, because one path carries the rules for Issues, checks, and PR bodies
- Good, because the stops caused by the shape of a `## Plan` section end with the section
- Bad, because a run costs about 1.5 to 2 times as much
- Bad, because a bug in one file takes an agreed Issue and a whole run, where `/fix` changed it in the session
- Bad, because a run asks a human 1 to 2 decisions where the build workflow asked none
- Bad, because a target repository needs a committed `.dotagents.json` (repository, remote, baseBranch, setup, check, ciChecks, capture) before its first run
- Bad, because the per-unit Red confirmed by script (`workflows/code.js`) and the per-unit commit carrying plan trailers (DR-0088) are not replaced. `/implement` checks the configured check's exit code in script, and whether the added tests are enough rests on the independent review of the whole diff. A change that adds no test still exits 0 on the existing suite
- Bad, because some of the decisions a run asks are setup of the target repository (writing `.dotagents.json`, allowing the check commands, choosing the launch through agents), where the build workflow needed none
- Neutral, because the comparison rests on 2 plan-based runs per task

### Confirmation

The removal change adds a retirement test of the form `workflows/_lib/tests/*-retirement.test.ts`. It fails when a removed path exists on the English side or under `.ja/`, and when a file under `skills`, `agents`, `workflows`, `rules`, or `hooks` names `/think`, `/issue`, `/qualify`, `/preview`, or the build workflow as a place to hand work to.

## Pros and Cons of the Options

### Keep both paths and choose per task

- Good, because a repository with no `.dotagents.json` keeps a route
- Good, because a task that suits a fixed plan keeps the lower cost
- Bad, because every rule about Issues and PR bodies stays written twice, and `/research` names which path to hand off to
- Bad, because the choice per task is left to the session, which the outcome moves away from

### Keep the plan-based path and retire `/scoping` and `/implement`

- Good, because a run costs less and asks no decision
- Bad, because the path missed an acceptance item on both measured tasks and left the README unchanged on both
- Bad, because the stops from the `## Plan` shape stay

## More Information

The measurements come from a session of 2026-11-11 to 2026-11-14 on bench clones of one repository. Its notes were not kept under `docs/research/`, and the bench clones were removed, so the table above is the surviving record. The build launch and stop counts come from the same session.

Since 2026-10-20 the plan-based path was called 45 times in cantle, 25 in cli-recall, 13 in feedback-loop, 11 in `~/.agents`, 10 in blog, 5 in cli-scout, and 4 in this repository. thkt made the decision to retire it on 2026-11-18. The same day thkt settled the four items the first draft left open: `/slice` and the two reviewers go, the per-unit Red is given up, and the plugin keeps its name.

`/challenge` on 2026-11-18 returned NO-GO for this record as first drafted, because unspecified items remained. Both critic passes returned weakened and neither disputed keeping one path. The four items are settled above, and the record holds once the Migration Plan's steps 1 to 3 are done.

### Deprecation Target

`/pr`, `/commit`, `/checkout`, `/research`, and `/challenge` stay, because each is called outside `/implement`.

`/fix` goes with the path. It changes one to three files with no agreed Issue, and thkt judged on 2026-11-18 that a fix made that easily leaves the codebase in a worse state. A bug goes through `/scoping` and `/implement` like any other change. It was called 8 times since 2026-09-28.

| Removed | With its |
| --- | --- |
| `skills/think`, `skills/issue`, `skills/qualify`, `skills/preview`, `skills/slice` | `.ja/` mirrors, scripts, references, tests. `/slice` reads `/issue`'s validator and template and routes each slice to the build workflow |
| `workflows/build.js`, `workflows/build/`, `workflows/code.js`, `workflows/code/` | `.ja/` mirrors, tests, and the retirement tests that read them |
| `skills/fix` | `.ja/` mirror, references, tests |
| `agents/reviewers/reviewer-conformance.md`, `agents/reviewers/reviewer-reuse.md` | `.ja/` mirrors. The build workflow is their one workflow caller |
| `agents/generators/generator-test.md`, `agents/resolvers/resolver-build.md` | `.ja/` mirrors. `/fix` is their one caller |
| `hooks/pre-bash/issue_body_gate.ts` | Its tests. It reads `skills/issue`'s validator and templates and is registered nowhere (DR-0123) |

Files that stay and name the removed path are rewritten in the removal change.

| File | What it holds |
| --- | --- |
| `.claude-plugin/marketplace.json`, `README.md`, `.ja/README.md` | The plugin is named `build` and described by the route `/issue` then the build workflow (DR-0083) |
| `skills/checkout/tests/branch-naming.test.js`, `skills/commit/tests/message-rules.test.js`, `skills/pr/tests/template-priority.test.js` | Each matches its skill's rule against the text `build.js` or `code.js` hands an agent. Each is pointed at `implement.js` or its rule loses the check by a stated choice |
| `skills/scribe/tests/structure-page.test.ts`, `workflows/tests/unit-caps-ssot.test.js` | The unit caps of `build.js`, which go with it |

Two things the removal leaves as they are.

- The per-unit Red is given up as Consequences states. A script check in `/implement` that the diff adds a test failing on the base commit is a separate Issue after the removal
- The plugin keeps the name `build`, the namespace a plugin user types, and its description is rewritten. Removing the build workflow takes priority over the name, so a rename is its own decision if the name misleads

### Migration Plan

1. Commit a `.dotagents.json` to the repositories that used the plan-based path and have none, which are this repository and blog. cantle, cli-recall, cli-scout, feedback-loop, and `~/.agents` have one
2. Add to `/scoping` the root cause of a bug as something settled before the Issue is agreed. DR-0094 required it of a bug plan, and `skills/scoping` names neither a bug nor a root cause today
3. Carry every open Issue that holds a `## Plan` through the build workflow, or agree it again through `/scoping`, in each repository that used the path. `/implement` returns an Issue with no recorded agreement to `/scoping`
4. Remove the workflows and the skills in one change, so no skill that stays hands work to a route that is gone. `/research` and `use-workflow-tdd-cycle` name `/fix` and are rewritten in it
5. In the change that removes the code a DR governs, mark that DR superseded by this one and rewrite the wiki pages that derive from it. The DRs are DR-0084, DR-0085, DR-0087, DR-0088, DR-0089, DR-0094, DR-0102, and DR-0103, and for `/fix` DR-0002, DR-0050, and DR-0099. DR-0083 stays while the plugin keeps its name. DR-0071 keeps its part about `assert`

### Rollback Plan

The removal is one revert per change. An Issue written by `/scoping` carries no `## Plan`, so a restored build workflow stops it as `no-plan` until a plan is written.

### Reassessment Triggers

- A run of `/implement` misses an acceptance item of an agreed Issue on a task the plan-based path is known to have met
- The cost of a run rises above twice the measured $10.97 on a task of the same size
- A repository cannot commit a `.dotagents.json` and has work to carry to a PR
- A PR that `/implement` published is merged with no test for a behavior its Issue lists as a done condition
