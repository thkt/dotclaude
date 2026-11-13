# Launching on the host

How to write args, and how to handle the output of the probe and of the host. Phase 2 of `/implement` and § Resuming a run that stopped use it.

## args

args is one JSON object. Write it to a file with the Write tool and pass it with `--args-file`. A file passes through no shell quoting, so a revision request that holds quotes or line breaks arrives whole. Leave `repo` out, because `--repo` supplies it. A launch through agents hands the Workflow tool an object with the same keys and `repo` added. The args of a launch that does not publish are `{"issue":"123","publish":false}`.

| Key           | Value                                                          | When it is present                              |
| ------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| `issue`       | The Issue number as a string: `number` from `gh issue view`    | Always                                          |
| `publish`     | The boolean `false`                                            | With `--no-publish`                             |
| `startCommit` | The start commit                                               | When step 5 of Phase 1 selected references      |
| `reports`     | `[{"path": "<path>", "blob": "<blob>"}]`                       | When step 5 of Phase 1 selected references      |
| `revision`    | `{"pr": "<PR URL>", "request": "<revision request>"}`          | In § Revising an existing PR                    |
| `retry`       | The `retry_next` a stop returned, unchanged                    | In § Resuming a run that stopped                |

## Probe output

The probe confirms that a child session can run commands under the user's permission rules. What it tries is `git status --short` and each executable of the check with `--version`. A rule that includes arguments, such as `Bash(bun run:*)`, allows the check and still refuses `bun --version`. When `denied` has that shape, tell the human that too.

| Output                                      | Handling                                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ran` is true                               | Go on to the next step of Phase 2                                                                                                                                                                                                     |
| `ran` is false, and `denied` has entries    | Do not launch. Show `denied`, and ask with AskUserQuestion for one of two: allow those commands in the permission rules and run the probe again, or launch this run per § Launching through agents                                    |
| `ran` is false, and `denied` is empty       | Do not launch. The child session did not start or did not finish. Show `why`. The main causes are `claude` missing from PATH and not being logged in. Ask with AskUserQuestion whether to fix it and run the probe again, or to launch this run per § Launching through agents |

## Host output

The host ends by printing a summary line, `claude-run: {...}`. Its `result` names the file holding the workflow's return value, and its `state` names the file to resume with. Read the return value from the `result` file and not from the output. The output has the log mixed in, and a long return value is cut short there.

| Output                                                          | Handling                                                                                                                                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A summary line whose `result` names a file                      | Read that file and handle it in Phase 3. Tell the human the `state`                                                                                                                              |
| A summary line whose `result` is null                           | The script ended with an exception. Show the `claude-run: the script threw` line and ask the human whether to launch again                                                                       |
| It printed `usage:` alone and ended                             | The host could not read the call. Check the flags and the JSON in the args file, fix them, and run again                                                                                         |
| It printed `held by the running process <pid>` and ended        | A host holding the same state is running. Check it with `ps -p <pid>`. When it is the run this session launched, wait for it to finish. Otherwise ask the human whether to end it                |
| `claude-run: state <path>` is there and no summary line follows | The host ended partway, a timeout included. The state is kept. Tell the human the path, and ask whether to run again with the same args and `--state "<path>"`. Do not add `retry` in this case |
