---
name: implement
description: Carry an agreed GitHub Issue through the implement workflow to implementation, verification, a draft PR, and CI confirmation, then check the published body and switch the PR to ready. Do NOT use to settle requirements (use /scoping) or for a review-only request.
when_to_use: 合意済みIssueを実装, Issueから実装, PR作成まで進める, 既存PRの修正, implement issue
allowed-tools: Read Write Edit LS Workflow AskUserQuestion Bash(${CLAUDE_SKILL_DIR}/scripts/*) Bash(${CLAUDE_SKILL_DIR}/../scribe/scripts/*) Bash(${CLAUDE_SKILL_DIR}/../../node_modules/.bin/textlint:*) Bash(jq:*) Bash(gh:*) Bash(git:*) Bash(cat:*) Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[issue number or URL] [--no-publish]"
---

# /implement - From an agreed Issue to a PR

Hand the Issue that `/scoping` brought to agreement to the implement workflow, which carries it deterministically from implementation to a draft PR and CI confirmation. This skill owns the checks before launch, and the published-body check and the switch to ready that the workflow leaves outside.

`$ARGUMENTS` is an Issue number or URL. With `--no-publish`, launch with publishing turned off, and the workflow stops at `verified_local`. When the target Issue cannot be identified, confirm with AskUserQuestion. The target repo is the current repository. When it turns out that the requirements need to change, stop and return to `/scoping`. Do not re-ask permission for each piece of work within the agreed scope.

Investigate the facts you can confirm, and ask early about facts only the user knows and about unsettled intent. When an instruction text is the reason to confirm or stop, show the path of the document actually read and the sentence in question, and separate the stated condition from your own interpretation.

## Phase 1: Check before launch

1. Fetch the Issue with `gh issue view <ref> --json number,title,body,state,url,comments`. Confirm that state is OPEN and that title and body are not empty. Read every section of the body and the comments for recorded agreement. When an unagreed point remains, do not launch, and return to `/scoping`. An unagreed point is an item marked unagreed (未合意), an open question, a decision left to the implementer, or a decision deferred with wording such as "confirm during implementation". Count a deferral in any section, even when the open-items section says "none". Once running, the workflow cannot ask a human, and it stops as `human-decision-required` when it meets an undecided point. When a decision is recorded only in a comment, also return to `/scoping` and put it into the body. The workflow passes only the title and the body to implementation and review.
2. Decide the target repo's absolute path with `git rev-parse --show-toplevel`.
3. Confirm that `.dotagents.json` is committed. The workflow checks it against the Codex target contract: repository, remote, baseBranch, setup, check, ciChecks, and capture. When it is absent, propose its content from package.json scripts or the CI definition through AskUserQuestion, hypothesis first, and proceed once the user has committed the agreed content by their own decision. When it has uncommitted changes, do not stash or port them; ask the user how to handle them. Check the Issue's required media against the `capture` setting with the table in `${CLAUDE_SKILL_DIR}/references/capture.md`; when they disagree, do not launch, and return to `/scoping`.
4. Observe the sandbox. Run ${CLAUDE_SKILL_DIR}/scripts/sandbox_probe.ts and handle `sandboxed`, `local_binding`, and `platform` from its output with the table in § Observing the sandbox. Do not infer the sandbox from settings files. A sandbox changed by a launch flag or a managed setting does not show up in them.
5. Select the references to pin. Per `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` § Read and retain, select the related wiki pages and decision records. For the wiki, read the `matched` and `scenes` pages from `${CLAUDE_SKILL_DIR}/../scribe/scripts/find_wiki_rule.ts docs/wiki <Issue terms> <paths likely touched> --scene implement`. Check the selected pages and records against the Issue and current code. Add the research reports the Issue references, per `${CLAUDE_SKILL_DIR}/../scoping/references/session.md` § Hand over research results. Only Markdown under `docs/research/`, `docs/wiki/`, and `docs/decisions/` can be a reference. Record each reference's blob with `git rev-parse HEAD:<path>` and the start commit with `git rev-parse HEAD`. When a needed report is not committed at HEAD, stop as an incomplete handover.
6. When the request is to revise an existing PR, leave this Phase for § Revising an existing PR.

## Phase 2: Launch the workflow

Launch with `Workflow({name: "implement", args: {issue: "<number>", repo: "<absolute path>"}})`. With `--no-publish`, add `publish: false` to args. When step 5 of Phase 1 selected references, add `startCommit: "<start commit>"` and `reports: [{path, blob}]`. The workflow checks each reference against its start-commit version, then passes them to implementation, repair, and independent review. The workflow implements, captures, checks, reviews independently, and repairs in an isolated worktree until the review is accepted. When publishing, it commits once, pushes, opens a draft PR, and waits for CI on the same head.

The workflow runs in the background, and its completion arrives as a notification. Do not poll its state before then, and do not edit its worktree. When you fixed the script in the same session that launches it, launch with `Workflow({scriptPath})` instead (name resolution uses the script as of session start).

## Phase 3: Handle the result

Branch on the return value's `status` or `stopped`. In every case, return the branch, worktree, commit, URL, review summary, and remaining work (`remaining`) from the return value to the user.

| Return value              | Handling                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status: verified_local`  | A run with publishing off. Show the verified branch and worktree, and leave commit and publication to the human                                   |
| `status: published_draft` | Check the published body and switch to ready per `${CLAUDE_SKILL_DIR}/references/publish.md`                                                      |
| `stopped` (a stop reason) | Decide the handling from the table in § Stop conditions. Do not continue by changing stop conditions or limits, and do not relaunch automatically. When the returned `retry_next` is not null, show the human § Resuming a run that stopped |

## Observing the sandbox

Inside the macOS sandbox Chromium cannot start, and the capture stops as `capture-unavailable` after implementation and review have finished. When the sandbox denies a local bind, a check that opens a web server socket fails on every round, and the uncapped repair loop never ends. Stop both before launch.

| Observation                                                                               | Handling                                                                                                             |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `sandboxed` is false                                                                      | Go on to the next step                                                                                               |
| `sandboxed` is true. `capture` in `.dotagents.json` is not null, and `platform` is darwin          | Do not launch. Tell the user to run it again in a session with the sandbox off                                       |
| `sandboxed` is true. `local_binding` is false                                             | Do not launch. Tell the user to set `sandbox.network.allowLocalBinding: true`. The setting applies without a restart |
| `sandboxed` is true. Neither of the two rows above applies                                | Go on to the next step                                                                                               |

## Resuming a run that stopped

A stop whose returned `retry_next` is not null can be resumed once its cause is fixed. The resume runs from the start of the round that stopped, or from the start of publication, and the implementation, repair, and review results before that come back from cache. Whether to resume is the human's call.

1. Fix the cause per the table in § Stop conditions. Do not touch the Issue or the worktree.
2. In the same session that launched the run, call Workflow again. Pass the script path the launch result showed as `scriptPath`. Pass as `resumeFromRunId` the runId the Workflow tool returned when it started the launch that stopped. Do not use the returned `run_id`, which is the ID of the run record. For args, add `retry: <retry_next>` to the same args as the launch. Pass `retry_next` unchanged.
3. Handle the result with the table in Phase 3.

| Situation                                     | Handling                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `retry_next` is null                          | Cannot resume. Follow the table in § Stop conditions                                                                       |
| The session that launched the run has ended   | Cannot resume. The cache does not cross sessions. Launch anew                                                              |
| The Issue changed (a new comment also counts) | Cannot resume. The resumed run stops as `requirements-changed`. Launch anew                                                |
| The resumed run stopped once more             | Repeat the same steps with that stop's `retry_next` and that launch's runId                                                |
| It stopped as `invalid-retry`                 | Do not use that launch's runId. Call again with the runId of the launch that stopped before it and that stop's `retry_next` |

## Revising an existing PR

Revising a PR this workflow published uses the same workflow. The user hands over the review findings a human adopted, the expected result, and the permission scope in one text. Do not collect or adopt PR comments automatically.

1. Confirm that the current Issue is human-agreed and that this revision request and its permission scope are consistent with that agreement. Do not judge agreement from body diffs or the OPEN state alone. Return unagreed requirement changes to `/scoping`.
2. Run steps 2 to 5 of Phase 1. When pinning references, the start commit is the PR-wide base (the start commit of the run that first published it).
3. Launch with `Workflow({name: "implement", args: {issue: "<number>", repo: "<absolute path>", revision: {pr: "<PR URL>", request: "<adopted findings, expected result, and permission scope>"}}})`. The workflow reuses the earlier worktree at the published head and reviews the whole PR against both the Issue and the request. It commits on the published head, pushes, rewrites the body, and waits for CI. It opens no new PR.
4. Handle the result with the same table as Phase 3.
5. Check the adopted findings' cause and whether they can recur, and only when needed connect them to existing wiki pages, decision records, tests, or lint per `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md`. Do not add improvements beyond this agreed scope to the existing PR's done conditions.

## Stop conditions

When the workflow stops, return `why` and the known URL, commit, and remaining conditions, and follow the handling below. From `push-unconfirmed` on, a write to GitHub may already have happened.

| Stop reason                                                                                                                        | Handling                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-issue` `no-repo` `issue-unreadable` `issue-not-open` `issue-repo-mismatch`                                                     | Check the Issue and the repo. Without an agreed, OPEN Issue in the target repo, return to `/scoping`                                                                                                                                            |
| `requirements-changed`                                                                                                             | The Issue changed during the run (a new comment also counts). When the title, body, or state changed, return to `/scoping` until a human agrees on the change. When only a comment was added, check its effect on the requirements and relaunch |
| `no-actor` `gh-host` `no-permission` `actor-changed`                                                                               | A human fixes gh's authentication or permission. Do not switch to another actor                                                                                                                                                                 |
| `uncommitted-start-inputs` `no-config` `invalid-config` `remote-mismatch` `repository-mismatch` `repo-unreadable` `no-ci-checks`   | Go back to step 3 of Phase 1, fix `.dotagents.json` or the remote, then relaunch                                                                                                                                                                |
| `invalid-reports` `start-commit-mismatch` `report-mismatch`                                                                        | Go back to step 5 of Phase 1, commit the references, record the start commit and blobs again, then relaunch                                                                                                                                     |
| `branch-exists` `branch-pr-exists`                                                                                                 | Show the earlier run's branch, worktree, and PR. Deleting or reusing them is the human's call                                                                                                                                                   |
| `human-decision-required`                                                                                                          | Show the returned findings and review, and ask for the human's decision on requirements, scope, or permission. Write the decision into the Issue body through `/scoping`. A decision written in a comment reaches neither implementation nor review. After the body changes, launch anew |
| `invalid-retry`                                                                                                                    | The retry that was passed was not accepted. Follow the table in § Resuming a run that stopped                                                                                                           |
| `invalid-repair` `invalid-review`                                                                                                  | An agent's reply broke the contract. Show `why` and ask the human whether to relaunch                                                                                                                                                           |
| `source-changed` `config-changed` `start-head-changed`                                                                             | The worktree, its `.dotagents.json`, or the checkout's HEAD changed mid-run. Find out who changed it before relaunching                                                                                                                         |
| `target-unavailable` `prepare-unavailable` `worktree-failed` `setup-failed` `check-unavailable` `pulls-unreadable` `commit-failed` | An environment problem. Fix the cause from the returned log tail, then relaunch                                                                                                                                                                 |
| `capture-unavailable` `capture-timeout` `capture-media-ignored` `invalid-capture`                                                  | Fix the capture environment or the `capture` setting. Changing a time limit is the human's call                                                                                                                                                 |
| `commit-mismatch` `pr-body-mismatch` `push-target-mismatch`                                                                        | Stopped before any write; nothing is published. Find the cause in the branch, body, or git settings                                                                                                                                             |
| `push-unconfirmed` `publication-unconfirmed` `attach-failed`                                                                       | Do not retry until `git ls-remote` and `gh pr view` confirm the actual state                                                                                                                                                                    |
| `invalid-revision` `revision-no-record` `revision-target-changed` `revision-worktree-mismatch`                                     | The PR to revise is not as this workflow published it. A human reconciles the changes stacked after publication, the worktree's changes, or the record, then relaunches with a new revision request                                             |
| `ci-failed`                                                                                                                        | Keep the draft. Find the cause from the failing check's log and fix it through § Revising an existing PR                                                                                                                                        |
| `ci-target-changed` `ci-unavailable` `ci-invalid-response` `ci-timed-out`                                                          | Keep the draft. Check the PR's target and CI with `gh pr view` before judging ready                                                                                                                                                             |
