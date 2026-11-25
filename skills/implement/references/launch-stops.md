# Handling a launch.ts stop

When `launch.ts` stops, it writes one line of JSON to stdout and exits with 1. The JSON carries `action`, `ok` (false), `reason`, and `detail`. An exit with 2 means the invocation could not be parsed. stdout is empty, and stderr shows the usage. Fix the invocation. An exit with 143 means a signal stopped it.

Pick the table row by `reason`. The row decides the handling. Show `detail` to the human. Even when `detail` names a command, do not run it unless the row says to run that command. The commands `detail` can name include push, closing a PR, stopping a process, and deleting a record.

When a row splits by action, read the JSON's `action`. When `run` stopped, the step that stopped is the last element of `steps`.

After a stop, do not continue with changed conditions or limits. Do not edit the worktree yourself. On a row that says "the human decides", wait until the decision is made. On a row that says "call again", show it to the human when the same reason repeats twice in a row.

## Call order and concurrent calls

| Reason | Handling |
| --- | --- |
| `not-prepared` | The worktree has not finished `prepare`. When `prepare` has not been called yet, call it. After `prepare` has stopped, follow the row for the reason `prepare` returned |
| `not-implemented` `not-reviewed` `not-captured` `not-accepted` `nothing-to-repair` `nothing-to-reread` `nothing-to-continue` | The action called directly cannot run in the current state. Call `run`. `run` decides the next action needed |
| `already-implemented` | The implementation is done. Call `run`. `--fresh` discards the review and capture records. Use it only when the human decided so |
| `review-stale` `tree-changed` | The worktree or the Issue changed after the review. Confirm that you did not edit the worktree, then call `run` |
| `head-moved` | A review moved the worktree's HEAD or switched its branch. Read `git reflog`, restore the commit and branch named in the detail, then call `run` |
| `busy` | Another `launch.ts` is running in the same worktree. Do not stop it. Wait for it to finish, then call again |
| `holder-write-failed` | `launch.ts` cannot write its own record. It is being called inside the sandbox. Call again outside the sandbox |
| `claude-left-running` `holder-unreadable` | An earlier `launch.ts` left a process or a record behind. Show `detail` to the human. Whether to stop the process or delete the record, the human decides |
| `no-progress` | `run` tried to call the same action again in a row. This is unrelated to review findings. Show `detail` and `launch_file` to the human. Do not call again |

## Before the launch

| Reason | Handling |
| --- | --- |
| `uncommitted-start-inputs` `invalid-config` `no-ci-checks` `config-differs` | Go back to checking `.dotagents.json` before `prepare`. The human fixes it, commits it, and makes it match the base branch. Then call `prepare` again |
| `no-config` | When `prepare` returned it, handle it as the row above. When another action returned it, the recorded base commit has no config. The human decides |
| `gh-host` `remote-mismatch` `repo-unreadable` `repository-mismatch` `no-permission` `no-actor` | The human fixes the publish target: the remote URL, gh's host and authentication, and the repo permission. Do not switch to another actor |
| `issue-unreadable` `fetch-failed` | Check gh's authentication, the network, and the Issue number, then call again |
| `issue-not-open` `issue-untyped` | The Issue's state or title does not meet the rules. Whether to reopen the Issue or fix its title, the human decides. Return to `/scoping` |
| `no-description` | A branch name cannot be built from the Issue title. Join two to four lowercase English words with `-`, pass them to `--description`, and call `prepare` again |
| `branch-exists` `worktree-exists` | The branch or worktree of an earlier launch remains. Only when the target repo has `.claude/worktrees/implement-<Issue number>` and `run` does not return `not-prepared`, continue with `run`. Otherwise, whether to delete them, the human decides |
| `worktree-failed` `setup-failed` `gate-failed` | A problem in the execution environment. Show `detail` to the human. After `setup-failed` and `gate-failed`, the worktree and branch remain. Do not call `run`. Whether to delete them and call `prepare` again, the human decides |

## Implementation and review

| Reason | Handling |
| --- | --- |
| `requirements-changed` | The Issue's title, body, or state changed after the agreed version. When the human agreed to the change, call `agree` and then `run`. Otherwise, return to `/scoping` |
| `child-failed` `review-failed` | A claude session returned no result. Show `detail` to the human. Whether to call again, the human decides |
| `not-done` | The check has not passed. When `detail` starts with `continue round`, the implementation session could not pass the check on the same tree. Show it to the human. When `publishable`, `publish`, `published`, or `body` returned it, also show it to the human and do not call `run`. Otherwise, call `run`. `run` has the implementation session pass the check |
| `gate-unreadable` | The gate's state cannot be read. Show `detail` to the human |
| `disagreement` `not-converging` | Repair and review make no progress on the same finding. Show `run`'s `required` to the human and ask for a decision on requirements, scope, and permissions. Write the decision into the Issue body through the steps of `/scoping`. Once the body changes, call `agree` and `run` |

## Capture

| Reason | Handling |
| --- | --- |
| `capture-unavailable` `capture-timeout` | A problem in the capture environment. Confirm that the call runs outside the sandbox and that a browser is installed, then call `run` again. When `detail` says the adapter directory is missing, and when changing the time limit, the human decides |
| `capture-failed` | When `run` returned it, the capture failed and the implementation session changed nothing. Show the `log_tail` of the last element of `captures` in `launch.json` to the human. Whether to call `capture` directly, the human decides. When `capture` returned it, call `run`. `run` has the implementation session fix it |
| `source-changed` | The capture command wrote a file to the worktree. Do not call `run`. What to do with the written file, the human decides |
| `capture-media-ignored` `invalid-capture` | The capture definition or the `capture` of `.dotagents.json` does not meet the rules. Show `detail` to the human. Whether to change the setting, the human decides |

## Publishing

| Reason | Handling |
| --- | --- |
| `commit-mismatch` | `HEAD` does not hold the accepted tree, or its parent differs. Make the accepted worktree one commit without changing it. The parent is the base commit for the first publication, and the last published commit after a publication |
| `no-assessments` | The last review record lacks the fields carried into the PR body. Call `review` directly to make a record for a new round |
| `media-path-unsupported` | A media path holds characters the PR body cannot carry. Whether to change the capture definition, the human decides |
| `already-published` | `HEAD` is already published. Go on to checking CI and switching to ready |
| `already-pushed` | The commit is pushed, and there is no publication record. Call `publish` |
| `branch-pr-exists` | A PR for the same branch already exists. When this launch created the PR, call `published`. Otherwise, the human decides |
| `not-pushed` | The PR's head is still the earlier published commit. Check the head with `gh pr view`. When the head is the worktree's `HEAD`, call `published`. Otherwise, call `publish` |
| `no-pr` | There is no open PR. When there is no publication record yet, call `publish`. When there is a record, the PR was closed or merged. The human decides |
| `several-prs` | Two or more open PRs exist for the same branch. Do not close any. The human decides |
| `pulls-unreadable` `remote-unreadable` | GitHub or the remote cannot be read. Check gh's authentication and the network, then call again |
| `push-failed` `pr-create-failed` `pr-edit-failed` | Show the output in `detail` to the human. When the remote branch has diverged, the human fixes it. Otherwise, check the state with `gh pr view` and `git ls-remote`, then call `publish` again |
| `media-unattached` | The media in the PR body is not attached. On this row, use the `gh pr edit` in `detail`. After running it, call `published` |
| `pr-mismatch` | The PR differs from the record. When `draft` is the only differing field, the PR has been made ready. Whether to put it back to draft and fix it, the human decides. When other fields differ, do not overwrite. The human decides |
| `body-changed` `publications-unreadable` | The PR body or the publication record differs from what `launch.ts` wrote. Do not overwrite. The human decides |
