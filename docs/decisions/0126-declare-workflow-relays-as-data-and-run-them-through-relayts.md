---
status: "accepted"
date: "2026-11-12"
decision-makers: thkt
scope: [meta, workflows]
---

# Declare workflow relays as data and run them through relay.ts

## Context and Problem Statement

A workflow script has no file access and cannot run a command, so every `git`, `gh` or check command goes through an agent. `workflows/implement.js` gave each such agent its commands as numbered prose and asked it to copy each output into a structured reply. In the bench run that reached a draft PR without a stop (`thkt/dotagents-workflow-trial` Issue #169, 2026-11-12), these relay agents were 30 of 34 agents, 46% of the output tokens, about 12 of the 30 minutes of the implementation stage, and about three quarters of the cache writes. The first relay alone, which reads the Issue and the target, took 65 seconds and 18,906 output tokens. Every stop fixed that week traced back to a relay: an agent miscopied the PR body, left a capture directory behind, or could not be resumed. How does a script get a command run without an agent reading it as prose and copying text both ways?

## Decision Drivers

- The implementing and reviewing agents carry the quality of the result, so the weight has to come off the relays and not off them
- A character an agent changes while copying a command or an output must not reach the script as a result
- The same script has to run on a host that evaluates it without Claude Code's agents, which is where the relays can cost nothing
- A plugin user's machine is not known to have bun, and a `bun` on PATH can be a shim that does not start

## Considered Options

- Declare each relay's commands as a spec, and have a bundled `relay.ts` run it (chosen)
- One bundled script per phase, each with its own inputs and outputs
- Keep the prose prompts and give the relays a cheaper model or lower effort

## Decision Outcome

Chosen option: "Declare each relay's commands as a spec", because the script stays the one place that says what runs, the agent copies neither a command nor a long output without a check, and a host can run the same spec with no agent.

A relay is `relay(label, phase, spec)`. The spec is `{defaults, steps}`, and a step is one `/bin/sh -c` line with its `cwd`, an optional `stdin`, `timeout_ms` and `when`, and the fields its exit code and output go into. The prompt carries the spec as one line of JSON between `RELAY_SPEC <digest>` and `RELAY_SPEC_END`. The agent runs `workflows/_lib/relay.ts <digest>`, which reads the spec back from the agent's own transcript (the mechanism DR-0125 uses for the PR body), runs the steps, and prints the fields with `relay_check`, the digest of those fields. The script compares the fields the agent returned with `relay_check`. On a mismatch it asks a second agent for the line `relay.ts` kept (`--replay`), which runs no step again, and treats a second mismatch as no result, which each call site already handles as its `*-unavailable` stop. A step returns the tail of its output only when its command failed.

Three details follow from limits outside the script.

| Limit | What the relay does |
| --- | --- |
| The Bash tool ends a call at 600 seconds | A step's `timeout_ms` stays under 600000. A call that may not fit its next step prints `relay_continue`, and the agent runs the same command again |
| A host with no transcript | The prompt has the agent write the spec line to a file and pass `--spec`, and `relay.ts` refuses a file whose digest differs |
| bun may be absent or a shim that fails | The launcher runs `bun --version` and starts the helper on node when that fails. The helpers stay runnable on both (DR-0113) |

`implement.js` no longer defines `anchor()`. A spec step that runs `git` or `gh` names the repository in its `cwd`, and the prose prompts that remain (implement, repair, review) pin the worktree through `inTree`.

### Consequences

- Good, because a relay's agent makes one Bash call with one short command. On the real prompt for the first relay it took 19 seconds and 5,264 output tokens, where the prose relay took 65 seconds and 18,906
- Good, because over a whole run the relays' output fell by about half. The 33 relays of the run on Issue #171 produced 1,166 output tokens each, where the 30 prose relays of the run on Issue #169 produced 2,500. Their time went from 23.7 to 19.1 seconds each, most of which is the commands themselves
- Good, because a changed character in a returned field is detected. The prose relays had no check, and the Issue body reached the implementing agent through such a copy
- Good, because the English and `.ja` scripts carry the same spec lines, so a relay's commands have no translation to keep in step
- Good, because a host that evaluates the script can run the spec itself. Ten commands of the first relay ran in 1.5 seconds with no agent
- Bad, because the agent count does not fall. Each relay still starts an agent and pays its context: the relays' cache writes were 1.42M tokens against 1.44M before
- Bad, because the spec is a small language of its own, and a step's meaning is in `relay.ts`, not in the prompt a person reads
- Bad, because the read-back depends on the transcript layout, the same dependency as DR-0125
- Neutral, because `build.js` and `code.js` keep their prose relays until they are converted

### Confirmation

`workflows/_lib/tests/relay.test.ts` runs specs for real: each source, `when`, `append`, internal fields, a timeout, `stdin` and `cwd`, a spec read from a transcript built in a temp directory, a refused digest, a spec handed over in a file, and a call that stops for its budget and goes on in the next call. `workflows/implement/tests/implement.behavior.test.js` checks that every agent other than the implementing, repairing, reviewing and naming ones carries a spec whose digest the prompt names, that the schema is the spec's fields plus `relay_check`, that no step can outlast the Bash tool, that a step with git or gh names its `cwd`, that no step returns a tail for a command that succeeded, and that fields not matching `relay_check` are asked for once more and read as no result the second time. The prompt `implement.js` builds for its first relay was given to a live haiku agent on 2026-11-12: one Bash call with the timeout as told, and the 7 KB reply matched `relay_check`.

## Pros and Cons of the Options

### One bundled script per phase, each with its own inputs and outputs

A `target` script, a `verify` script, a `ship` script and so on, each doing a phase's commands and returning its result.

- Good, because adjacent relays merge, so the agent count falls
- Bad, because the commands and the decisions between them move out of the workflow script into as many scripts, and the script's tests stop covering them
- Bad, because every phase needs its own input and output contract, where one spec format serves all relays and other workflows

### Keep the prose prompts and give the relays a cheaper model or lower effort

- Good, because nothing is rewritten
- Bad, because the relays already run on haiku, and the copy in both directions stays, with the errors it produced

## More Information

DR-0105 (`docs/decisions/0105-*.md`) made `repo` a required argument and had every prompt pass through `anchor()`. One of its reassessment triggers is a rise in prompts that do not pass through `anchor()`. In `implement.js` the pin is now the `cwd` of each step, which the tests check, and no prompt names a command for the agent to place itself.

DR-0125 (`docs/decisions/0125-read-the-pr-body-back-from-the-agent-transcript.md`) introduced the read-back for the PR body. `workflows/_lib/transcript.ts` now holds the scan both use.

The first whole run with the converted relays (Issue #171) stopped at prepare. A setup that succeeded returned the last 40 lines of its output, among them the progress bar of a download, and the agent changed the count of its repeated character. `relay_check` caught it, and the run stopped as `prepare-unavailable` with the worktree already built. Two changes followed in the same change: a tail is returned only for a command that failed, and a mismatch is answered by `--replay` before it becomes no result. The run after that reached draft PR #172 with all five acceptance items met and no mismatch.

### Reassessment Triggers

- A `relay_check` mismatch survives the replay and stops a run. The copy back of a long field is then still too error-prone, and the field should go to a file with only its path and digest returned
- Workflow scripts gain a way to run a command, at which point no relay is needed
- The node or bun host that runs specs with no agent becomes the default, which leaves the agent path as a fallback and may let the fallback instructions in the prompt go
- A second workflow needs a step the spec cannot express, which is the point to decide whether the spec grows or that relay stays prose
