---
status: "accepted"
date: "2026-11-13"
decision-makers: thkt
scope: [meta, workflows]
---

# Launch the implement workflow on a host that runs relays itself

## Context and Problem Statement

DR-0126 turned the commands of each relay into a spec, and each relay still started one agent. In whole runs of the implement workflow on `thkt/dotagents-workflow-trial`, about 30 relay agents took 491 to 545 seconds of a 30-minute run and wrote 1.4 million tokens of cache. The agent also copies the printed result into its structured reply, and that copy stayed the unstable part: a tab or a line break came back as two characters in three runs, and one run ended at its first relay when the agent lost every field after the Issue body.

A workflow script inside Claude Code cannot run a command, which is why the relays exist. Outside that runtime the same script can be evaluated by a host that runs the specs itself. `workflows/_lib/claude-run.ts` is that host. Which path `/implement` launches by default, and what happens on a machine where the host cannot work, had to be decided.

## Decision Drivers

- The implementing and reviewing agents carry the quality of the result, so a lighter path must leave them as they are
- A plugin user finishes `/implement` on a machine with no setting of the author's
- A prompt carries text the script did not write (an Issue body, a check's output), and that text must not become a command the host runs or a session runs unasked
- A run that stopped is resumed without implementing again (DR-0124)

## Considered Options

- Launch on the host by default, and through agents when a human chooses it after the host's probe fails (chosen)
- Keep the launch through agents as the default, and offer the host as an option
- Launch on the host alone and remove the launch through agents

## Decision Outcome

Chosen option: "Launch on the host by default, and through agents when a human chooses it after the host's probe fails", because the host removes the copy that made relays unstable and the time they took, while a machine the host cannot serve still finishes the run.

`/implement` runs `skills/implement/scripts/host.ts`, which calls `claude-run.ts`. The host evaluates `workflows/implement.js` and answers each `agent()` call in one of three ways. A call whose result the state file holds returns that result. A relay has its spec run by `relay.ts`'s `runSpec`, with no agent. Every other call (implementing, reviewing, repairing, naming) starts one `claude -p` child session.

| Question | Decision |
| --- | --- |
| What makes a call a relay | Its schema asks for `relay_check`. The schema is the script's, so a spec block quoted from an Issue body into an implementing prompt is never run. A relay whose spec cannot be read returns nothing, and is not handed to a session |
| What a child session may do unasked | Read and edit files. A command runs when the user's own permission rules allow it. The session gets neither the Agent tool nor the Workflow tool |
| Before launch | `host.ts probe` has one child session run `git status` and the check's executables. When the rules refuse one, `/implement` does not launch. It shows what was refused and asks the human to allow the commands or to launch this run through agents |
| Where the host runs | Outside the sandbox, as a background command of the session. The host runs the check and the capture itself, and inside the sandbox Chromium does not start and a web server may fail to bind |
| Resuming | The state file keeps each call's result. The same file and the `retry` a stop returned run only what the stopped boundary and the calls after it need. The file outlives the session that launched the run |
| The launch through agents | Stays as DR-0126 left it, for the run a human sends there |

### Consequences

- Good, because a relay costs no agent: the commands of 29 relays took 327 seconds in a run where 30 relay agents had taken 491 to 545
- Good, because no agent copies a result, so `relay_check` cannot fail and no replay is needed
- Good, because a run can be resumed from another session while its state file exists
- Bad, because a child session is a whole session. It loads the user's own instructions and settings, and it behaves less like the agents of the workflow runtime than they behave like each other. Two differences were found in whole runs and closed: a session that ended in prose with no structured reply, and one that started reviewers of its own
- Bad, because the host needs the `claude` command on PATH and permission rules that allow the repository's check commands. A machine with neither goes through agents, by a human's choice
- Bad, because the launch is one command outside the sandbox, which a session in a sandbox has to be allowed
- Bad, because two launch paths are kept, and a change to how a relay is answered has to hold on both
- Neutral, because the state file holds prompts and command output until the system clears its temporary directory. It is readable by its owner alone

### Confirmation

`workflows/_lib/tests/claude-run.test.ts` runs the host with real spec commands and with a fake `claude` on PATH: a relay runs with no session, a spec block in a prompt that is not a relay's is not run, a session's argv and stdin, the reply asked for again in the same session, the state file resumed and read past a cut line, the lock, the file modes, the probe, and the command's result file. `skills/implement/tests/workflow-contract.test.js` checks that the skill launches through `host.ts`, asks the probe first, routes every field the probe prints, and reads the keys the host's last line prints. `skills/implement/tests/host.test.ts` runs the script as a command.

Whole runs on `thkt/dotagents-workflow-trial`, compared by the shape of the run:

| Run | Path | Checks, reviews, repairs, captures | Time of the implementing stage | Cost | Acceptance items met |
| --- | --- | --- | --- | --- | --- |
| Issue #173 | agents | 2, 2, 1, 2 | 30.0 min | $9.04 | 5 of 5 |
| Issue #175 | agents | 2, 2, 1, 2 | 31.5 min | $9.64 | 5 of 5 |
| Issue #185 | host | 2, 2, 1, 2 | 19.9 min | $6.77 | 5 of 5 |
| Issue #178 | agents | 1, 1, 0, 1 | 25.3 min | $8.03 | 5 of 5 |
| Issue #188 | host | 1, 1, 0, 1 | 15.4 min | $4.70 | 5 of 5 |

Each shape has one run on the host at its current version, and the time of the opus sessions varies from run to run, so the size of the difference is a first reading.

## Pros and Cons of the Options

### Keep the launch through agents as the default, and offer the host as an option

- Good, because the default keeps working on every machine with no probe
- Bad, because the default keeps the relay agents' time and the copy errors, which the measurement shows are the cost that can be removed without touching quality
- Bad, because an option nobody selects is not exercised, and the host would drift from the script

### Launch on the host alone and remove the launch through agents

- Good, because one path is kept
- Bad, because a plugin user whose permission rules allow no command, or who has no `claude` on PATH, could not finish `/implement`, which the repository's outcome requires
- Bad, because the workflow could no longer be launched with the Workflow tool, the form every other workflow of this repository uses

## More Information

The first version of the host looked for a spec block in every prompt. An implementing prompt quotes the Issue body, so a body holding a block with the digest anyone can compute for it had its commands run by the host, with the user's credentials. A review reproduced it before the host was the default. The schema decides now, and the reproduction runs no command.

Six whole runs on the host preceded this decision. Four reached a draft PR. One stopped because the implementing session wrote its change and ended in prose: the host now asks for the reply once more in the same session. One stopped as `human-decision-required` when a test of the trial repository failed twice on a signal to a process group, and the repairing session returned the decision because the test was outside the agreed scope. That test's failure is intermittent in the session's own runs too. It has not appeared in a run through agents, and one run does not show whether the host makes it likelier.

A child session with Bash allowed unasked was the first default. It was withdrawn in review: the prompt carries the Issue body, and nobody is asked. Under the user's own rules the trial machine still runs the commands.

### Reassessment Triggers

- Workflow scripts gain a way to run a command, at which point neither a relay nor this host is needed
- The probe refuses on most machines the plugin is installed on, so the default path is one most users never take
- A whole run on the host stops for a cause a run through agents does not have, more than once in ten runs
- `claude -p` changes a flag the host passes (`--json-schema`, `--resume`, `--allowedTools`, `--disallowedTools`) or the shape of its JSON result
- A second workflow is launched on the host and needs something of a child session that `implement` does not
