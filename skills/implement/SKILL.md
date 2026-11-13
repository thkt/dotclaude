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

1. Fetch the Issue with `gh issue view <ref> --json number,title,body,state,url,comments`. Confirm that state is OPEN and that title and body are not empty. Read every section of the body and the comments for recorded agreement. When an unagreed point remains, do not launch, and return to `/scoping`. An unagreed point is an item marked unagreed (未合意), an open question, a decision left to the implementer, or a decision deferred with wording such as "confirm during implementation". Count a deferral in any section, even when the open-items section says "none". Once running, the workflow cannot ask a human, and it stops as `human-decision-required` when it meets an undecided point. When a decision is recorded only in a comment, also return to `/scoping` and put it into the body. When the body carries no verdicts for the steps the target repo's policy imposes on this change, also return to `/scoping`. Do the same when the body does not say how to handle a step judged as one the workflow cannot carry out. The criteria are in ${CLAUDE_SKILL_DIR}/../scoping/references/sufficiency.md § Steps the target repo's policy imposes; do not judge the steps again here. The handling has to be one of the three under § Handling a step the workflow cannot carry out of that document: put it into the check or capture, hand it over to a named owner, or leave it out of this scope. When it is none of them, when a handover names no owner and no time, or when it has the host or the workflow do the step later, also return to `/scoping`. Return as well when the handling cell names a substitute step to be done inside the run. A cell that says the same check is done with another tool is such a case. The workflow passes only the title and the body to implementation and review.
2. Decide the target repo's absolute path with `git rev-parse --show-toplevel`.
3. Confirm that `.dotagents.json` is committed. The workflow checks it against the Codex target contract: repository, remote, baseBranch, setup, check, ciChecks, and capture. When it is absent, propose its content from package.json scripts or the CI definition through AskUserQuestion, hypothesis first, and proceed once the user has committed the agreed content by their own decision. When it has uncommitted changes, do not stash or port them; ask the user how to handle them. Check the Issue's required media against the `capture` setting with the table in `${CLAUDE_SKILL_DIR}/references/capture.md`; when they disagree, do not launch, and return to `/scoping`. For a step whose handling in the Issue is "put it into the check or capture", confirm that the committed `check` or `capture` runs it, and when it does not, do not launch, and return to `/scoping`.
4. Observe the sandbox. Run ${CLAUDE_SKILL_DIR}/scripts/sandbox_probe.ts and keep its output. When `local_binding` and `sandboxed` are both false, do not launch, and ask the human what is denying the bind. The rest of the output is handled with the table in § Observing the sandbox when launching through agents. Do not infer the sandbox from settings files. A sandbox changed by a launch flag or a managed setting does not show up in them.
5. Select the references to pin. Per `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` § Read and retain, select the related wiki pages and decision records. For the wiki, read the `matched` and `scenes` pages from `${CLAUDE_SKILL_DIR}/../scribe/scripts/find_wiki_rule.ts docs/wiki <Issue terms> <paths likely touched> --scene implement`. Check the selected pages and records against the Issue and current code. Add the research reports the Issue references, per `${CLAUDE_SKILL_DIR}/../scoping/references/session.md` § Hand over research results. Only Markdown under `docs/research/`, `docs/wiki/`, and `docs/decisions/` can be a reference. Record each reference's blob with `git rev-parse HEAD:<path>` and the start commit with `git rev-parse HEAD`. When a needed report is not committed at HEAD, stop as an incomplete handover.
6. When the request is to revise an existing PR, leave this Phase for § Revising an existing PR.

## Phase 2: Launch the workflow

Launch the workflow on the host (`workflows/_lib/claude-run.ts`). The host runs the workflow's commands itself and hands only implementing, reviewing, repairing, and naming to `claude -p` child sessions (DR-0127). The workflow implements, captures, checks, reviews independently, and repairs in an isolated worktree until the review is accepted. When publishing, it commits once, pushes, opens a draft PR, and waits for CI on the same head.

A child session runs only the commands the user's own permission rules allow. When the rules do not allow the check's commands, the implementing session works for minutes without being able to run a test. The probe of steps 1 and 2 finds that before launch.

Run the commands of steps 2 and 4 with Bash and with the sandbox off (`dangerouslyDisableSandbox: true`). The host runs the check and the capture itself, and inside the sandbox Chromium does not start and a web server may fail to bind. When turning the sandbox off is not permitted, stop and tell the human, and do not run them inside the sandbox instead. How to write args, and how to handle the output of the probe and of the host, are in ${CLAUDE_SKILL_DIR}/references/host.md.

1. Read the check's executable with `jq -r '.check | if type == "string" then split(" ")[0] else .[0] end' "<absolute path>/.dotagents.json"`.
2. Run `${CLAUDE_SKILL_DIR}/scripts/host.ts probe --repo "<absolute path>" "git status --short" "<executable> --version"` with the timeout at 180000. Add one quoted argument for each executable. Handle the output with § Probe output of the references.
3. Write the args JSON to a file with the Write tool. The keys are in § args of the references. With `--no-publish`, add `publish: false`.
4. Run `${CLAUDE_SKILL_DIR}/scripts/host.ts run implement --repo "<absolute path>" --args-file "<args file>"` in the background. Set `run_in_background: true` and the timeout at 7200000.
5. Wait for the completion notification. Do not poll the state before then, and do not edit the worktree.
6. Find the summary line in the output with `ugrep '^claude-run: \{'`, and handle it with § Host output of the references.

## Phase 3: Handle the result

Branch on the return value's `status` or `stopped`. In every case, return the branch, worktree, commit, URL, review summary, and remaining work (`remaining`) from the return value to the user. When the returned `body_transport` is `copied`, also return that the PR body could not be read back from the transcript and an agent copied it, with the reason in `body_fallback`.

| Return value              | Handling                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status: verified_local`  | A run with publishing off. Show the verified branch and worktree, and leave commit and publication to the human                                   |
| `status: published_draft` | Check the published body and switch to ready per `${CLAUDE_SKILL_DIR}/references/publish.md`                                                      |
| `stopped` (a stop reason) | Decide the handling from the table in § Stop conditions. Do not continue by changing stop conditions or limits, and do not relaunch automatically. When the returned `retry_next` is not null, show the human § Resuming a run that stopped |

## Launching through agents

The path for when the host cannot be used: the probe of Phase 2 returned false and the human chose this path. An agent runs each of the workflow's commands, so it takes more time and money than the host (DR-0127).

1. Handle the output kept at step 4 of Phase 1 with the table in § Observing the sandbox.
2. Launch with `Workflow({name: "implement", args: {issue: "<number>", repo: "<absolute path>"}})`. Add to args the same keys as § args of ${CLAUDE_SKILL_DIR}/references/host.md.
3. Wait for the completion notification. Do not poll the state before then, and do not edit the worktree. Phase 3 handles the return value.

When you fixed the script in the same session that launches it, launch with `Workflow({scriptPath})` instead. Name resolution uses the script as of session start.

## Observing the sandbox

Through agents, an agent runs the workflow's commands inside the session's sandbox. Inside the macOS sandbox Chromium cannot start, and the capture stops as `capture-unavailable` after implementation and review have finished. When a local bind is denied, a check that opens a web server socket fails on every round, and the uncapped repair loop never ends. Stop both before launch. Apply the table from its top row. A launch on the host does not use this table. The host runs the check and the capture outside the sandbox.

| Observation                                                                                 | Handling                                                                                                             |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `local_binding` is false                                                                    | Do not launch. Tell the user to set `sandbox.network.allowLocalBinding: true`. The setting applies without a restart |
| `sandboxed` is true. `capture` in `.dotagents.json` is not null, and `platform` is darwin   | Do not launch. Tell the user to run it again in a session with the sandbox off                                       |
| Neither of the two rows above applies                                                       | Go on to step 2 of § Launching through agents                                                                        |

## Resuming a run that stopped

A stop whose returned `retry_next` is not null can be resumed once its cause is fixed. The resume runs from the start of the round that stopped, or from the start of publication, and the implementation, repair, and review results before that come back from the state file. Whether to resume is the human's call.

1. Fix the cause per the table in § Stop conditions. Do not touch the Issue or the worktree.
2. Do steps 3 to 6 of Phase 2. The args are the launch's keys with `retry: <retry_next>` added. Add `--state "<the launch's state>"` to the command of step 4.
3. Handle the result with the table in Phase 3.

The state is the file named in the launch's summary line. When the session that launched has ended, use the path it told the human. The returned `run_id` is the ID of the run record, so do not use it in place of the state.

| Situation                                              | Handling                                                                                                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `retry_next` is null                                   | Cannot resume. Follow the table in § Stop conditions                                                                                                                                                              |
| The state file is gone                                 | Cannot resume. Launch anew per Phase 2                                                                                                                                                                            |
| The Issue changed (a new comment also counts)          | Cannot resume. The resumed run stops as `requirements-changed`. Launch anew per Phase 2                                                                                                                           |
| The resumed run stopped once more                      | Repeat step 2 with that stop's `retry_next` and the same state                                                                                                                                                    |
| It stopped as `invalid-retry`                          | Do step 2 with the `retry_next` of the stop before it and the same state                                                                                                                                          |
| Launched through agents, and that session is still on  | Call Workflow again in that session. Pass the script path the launch result showed as `scriptPath`, pass as `resumeFromRunId` the runId the Workflow tool returned at launch, and add `retry: <retry_next>` to args |
| Launched through agents, and that session has ended    | Cannot resume. The cache does not cross sessions. Launch anew                                                                                                                                                     |

## Revising an existing PR

Revising a PR this workflow published uses the same workflow. The user hands over the review findings a human adopted, the expected result, and the permission scope in one text. Do not collect or adopt PR comments automatically.

1. Confirm that the current Issue is human-agreed and that this revision request and its permission scope are consistent with that agreement. Do not judge agreement from body diffs or the OPEN state alone. Return unagreed requirement changes to `/scoping`. When the revision request touches a document or a publication step the Issue does not cover, also confirm that the Issue or the request carries that step's verdict and handling, and return to `/scoping` when it does not.
2. Run steps 2 to 5 of Phase 1. When pinning references, the start commit is the PR-wide base (the start commit of the run that first published it).
3. Launch with steps 1 to 6 of Phase 2. In args, put the current Issue's number in `issue` and add `revision: {pr: "<PR URL>", request: "<adopted findings, expected result, and permission scope>"}`. The workflow reuses the earlier worktree at the published head and reviews the whole PR against both the Issue and the request. It commits on the published head, pushes, rewrites the body, and waits for CI. It opens no new PR.
4. Handle the result with the same table as Phase 3.
5. Check the adopted findings' cause and whether they can recur, and only when needed connect them to existing wiki pages, decision records, tests, or lint per `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md`. Do not add improvements beyond this agreed scope to the existing PR's done conditions.

## Stop conditions

When the workflow stops, return `why` and the known URL, commit, and remaining conditions, and decide the handling with the table in ${CLAUDE_SKILL_DIR}/references/stops.md. When the return carries `relay_note`, return that too.
