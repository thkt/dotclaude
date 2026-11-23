---
name: implement
description: Carry an agreed GitHub Issue through launch.ts to implementation, verification, and review, then publish a draft PR, confirm CI, and switch it to ready. Do NOT use to settle requirements (use /scoping) or for a review-only request.
when_to_use: 合意済みIssueを実装, Issueから実装, PR作成まで進める, 既存PRの修正, implement issue
allowed-tools: Read Write Edit LS AskUserQuestion Bash(${CLAUDE_SKILL_DIR}/scripts/*) Bash(${CLAUDE_SKILL_DIR}/../../node_modules/.bin/textlint:*) Bash(jq:*) Bash(gh:*) Bash(git:*) Bash(cat:*) Bash(ugrep:*) Bash(bfs:*)
argument-hint: "[issue number or URL] [--no-publish]"
---

# /implement - From an agreed Issue to a PR

Carry the Issue that `/scoping` brought to agreement with `launch.ts`. In an isolated worktree, `launch.ts` repeats implementation, the check, the capture, two reviews, and repair until the review accepts. The session running this skill is called the AI in charge. The AI in charge owns the check before launch, the commit of the accepted change, publication, the CI check, and the switch to ready.

`$ARGUMENTS` is an Issue number or URL. With `--no-publish`, stop in Phase 3 without committing or publishing. When the target Issue cannot be identified, confirm with AskUserQuestion. The target repo is the current repository. When it turns out that the requirements need to change, stop and return to `/scoping`. Do not re-ask permission for each piece of work within the agreed scope.

Investigate the facts you can confirm, and ask early about facts only the user knows and about unsettled intent. When an instruction text is the reason to confirm or stop, show the path of the document actually read and the sentence in question, and separate the stated condition from your own interpretation.

`launch.ts` is at ${CLAUDE_SKILL_DIR}/scripts/launch.ts. Call `launch.ts` and the `git` commit into the worktree with Bash and with the sandbox off (`dangerouslyDisableSandbox: true`). Inside the sandbox, `launch.ts` cannot write its own record, and the capture browser does not start. When turning the sandbox off is not permitted, stop and tell the human, and do not call it again inside the sandbox. `launch.ts` writes one line of JSON to stdout. How to handle a stop is in § Stop conditions.

## Phase 1: Check before launch

1. Fetch the Issue with `gh issue view <ref> --json number,title,body,state,url,comments`. Confirm that state is OPEN and that title and body are not empty. Read every section of the body and the comments for recorded agreement. When an unagreed point remains, do not launch, and return to `/scoping`. An unagreed point is an item marked unagreed (未合意), an open question, a decision left to the implementer, or a decision deferred with wording such as "confirm during implementation". Count a deferral in any other section, even when the open-items section says "none". The sessions `launch.ts` starts cannot ask a human. When they meet an undecided point, repair and review make no progress and stop. When a decision is recorded only in a comment, also return to `/scoping` and put it into the body. When the body carries no verdicts for the steps the target repo's policy imposes on this change, also return to `/scoping`. Do the same when the body does not say how to handle a step judged as one the workflow cannot carry out. The criteria are in ${CLAUDE_SKILL_DIR}/../scoping/references/sufficiency.md § Steps the target repo's policy imposes; do not judge the steps again here. The handling has to be one of the three under § Handling a step the workflow cannot carry out of that document: put it into the check or capture, hand it over to a named owner, or leave it out of this scope. When it is none of them, when a handover names no owner and no time, or when it has the host or the workflow do the step later, also return to `/scoping`. Return as well when the handling cell, beyond the handling itself, assigns work to implement, the workflow, the host, or the review. "implement confirms with another tool" is such a case. A step a named person does outside the run is not. A step the AI in charge does outside the run of `launch.ts` is not either. The implementation and review sessions read only the Issue's title and body.
2. Decide the target repo's absolute path with `git rev-parse --show-toplevel`.
3. Confirm that `.dotagents.json` is committed and matches the base branch. `launch.ts prepare` checks repository, remote, baseBranch, setup, check, ciChecks, and capture. When it is absent, propose its content from package.json scripts or the CI definition through AskUserQuestion, hypothesis first, and proceed once the user has committed the agreed content by their own decision. When it has uncommitted changes, do not stash or port them; ask the user how to handle them. Check the Issue's required media against the `capture` setting with the table in ${CLAUDE_SKILL_DIR}/references/capture.md; when they disagree, do not launch, and return to `/scoping`. For a step whose handling in the Issue is "put it into the check or capture", confirm that the committed `check` or `capture` runs it, and when it does not, do not launch, and return to `/scoping`.
4. Extract from the body the checks the Issue hands over to the AI in charge. Note them by when they are done: before publication, after publication, and after the change reaches main. Return the checks after the change reaches main to the user at the end of Phase 3 as remaining work.
5. When the request is to revise an existing PR, leave this Phase for § Revising an existing PR.

## Phase 2: Implementation and review

The sessions `launch.ts` starts run only the commands the user's own permission rules allow. When the rules do not allow the check's commands, the implementation session cannot pass the check, and `run` stops with `not-done`.

1. Call `launch.ts prepare --repo "<absolute path>" --issue <number>`. When the Issue title has fewer than two English words, add `--description <two to four lowercase English words joined with ->`. Note the output's `worktree` and `branch`. The worktree is `.claude/worktrees/implement-<number>` of the target repo.
2. Call `launch.ts run --worktree "<worktree>" > "<result file>"` in the background. Set `run_in_background: true` and the timeout at 7200000. `run` writes the result JSON to stdout in one line, and a line per step to stderr.
3. Wait for the completion notification. Do not poll the state before then, and do not edit the worktree.
4. Read the JSON in the result file. When `action` is `run`, `ok` is true, and `verdict` is `accepted`, go on to Phase 3. Note `rounds` and `cost_usd`. When the file is empty, a signal or the time limit stopped `run`. Call again from step 2. Otherwise, handle it with § Stop conditions.

## Phase 3: Commit and publication

With `--no-publish`, do not commit. Return the worktree, the branch, `launch_file`, and the review results, and end.

1. Read the record in `launch_file`. The record is one JSON document. The reviews of the last round are in the last element of `reviews`. That element's `self` and `independent` are the self-review and the independent review, and each holds `findings` and `verified`. The implementation session's reply is in `implement.reply`. You can read them with `jq '.reviews[-1] | .self, .independent | {findings, verified}' "<launch_file>"` and `jq -r '.implement.reply' "<launch_file>"`. From the reply, extract the decisions the Issue does not state.
2. Do the checks noted in step 4 of Phase 1 that come before publication. Do not change the worktree's files. Note the results.
3. Call `git -C "<worktree>" add -A` and `git -C "<worktree>" commit -m "<Issue title> (#<number>)"`, in this order. Without `-C`, the commit lands in the target repo's checkout. `add -A` stages the same files as the tree the review accepted in Phase 2. Do not change the files.
4. Call `launch.ts publish --worktree "<worktree>"`. Note the output's `url` and `number`. `publish` does the push, the draft PR creation, and the media attachment. It then checks the body and records the publication. Do not run `git push` or `gh pr create` yourself.
5. Go on to the procedure in ${CLAUDE_SKILL_DIR}/references/publish.md. Read the body and write the confirmation comment. Check CI and switch to ready.
6. Return to the user the PR URL, the confirmed results, what was not confirmed, and the remaining work. The remaining work includes the checks done after the change reaches main. A human decides the merge.

## Revising an existing PR

Revising a PR this skill published also uses the same worktree and `launch.ts`. The worktree is `.claude/worktrees/implement-<number>` of the target repo. Put the findings a human adopted into the Issue body. Do not collect or adopt PR comments automatically.

1. Write the adopted findings, the expected result, and the permission scope into the Issue body through the steps of `/scoping`. Do not judge agreement from body diffs or the OPEN state alone.
2. Call `launch.ts agree --worktree "<worktree>"`. When `changed` is false, the Issue has not changed. Go back to step 1.
3. When the PR is ready, confirm with the human that it goes back to draft during the revision, and put it back with `gh pr ready <n> --undo`. While it stays ready, `publish` stops with `pr-mismatch`.
4. Do steps 2 to 4 of Phase 2. `run` has the implementation session read the Issue again, and redoes the capture and the review.
5. Do Phase 3. Stack one commit on top of the published commit. `publish` opens no new PR and rewrites the body of the same PR.
6. Check the adopted findings' cause and whether they can recur, and only when needed connect them to existing decision records, tests, or lint per ${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md. Do not add improvements beyond this agreed scope to the existing PR's done conditions.

## Stop conditions

When `launch.ts` stops, decide the handling with the table in ${CLAUDE_SKILL_DIR}/references/launch-stops.md. Return `reason`, `detail`, and the known worktree, commit, and URL to the user. After a stop, do not continue by changing conditions or limits.
