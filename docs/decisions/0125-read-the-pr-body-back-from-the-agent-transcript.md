---
status: "accepted"
date: "2026-11-12"
decision-makers: thkt
scope: [meta, workflows]
---

# Read the PR body back from the agent transcript

## Context and Problem Statement

`workflows/implement.js` generates the PR body, and a workflow script has no file access, so an agent has to put the body into a file before `gh pr create --body-file` reads it. DR-0120 settled on handing the agent the body as a base64 heredoc and comparing a digest of what was written, because an agent that copied the body as text rewrote half-width kana. The digest check then stopped every wrong copy, and the copies kept going wrong. On 2026-11-12 the bench on `thkt/dotagents-workflow-trial` had an agent copy the body four times (Issues #165 and #167), and three of the four copies stopped as `pr-body-mismatch`: the sonnet agent changed one or two characters in about 10 KB of base64, in a different place each time. The first copy failed in both runs. How does the body reach the file without a model copying it?

## Decision Drivers

- No character of the body may depend on a model reproducing it
- The script keeps generating the body and keeps checking a digest of the file, so a wrong file still stops the run before any write to GitHub
- A workflow script cannot import a module or touch a file, so whatever writes the file runs inside an agent's Bash call
- The Codex runner (`workflows/_lib/codex-run.ts`) runs the same script on a host that keeps no Claude Code transcript

## Considered Options

- A bundled script reads the block back from the agent's own transcript, with the agent's copy as the fallback (chosen)
- Split the base64 into small chunks, each copied and verified by its own agent call
- Move the body generation into a bundled script that reads the review from the run's journal
- Keep the single copy and resume from Ship on a mismatch

## Decision Outcome

Chosen option: "A bundled script reads the block back from the agent's own transcript", because Claude Code already stores the agent's prompt on disk byte for byte, so the body can reach the file with no model in the path, and the script's generation and digest check stay where they are.

The body agent's prompt still carries the base64 heredoc. Its first step runs `workflows/implement/write-body.ts <digest> <file>`. That script scans the agent transcripts under `$HOME/.claude/projects/<project>/<session>/subagents/` that changed in the last two hours, decodes each `PR_BODY_B64` block found in a user message, and writes the one whose body carries the digest the workflow passed. When it exits non-zero, the agent runs the heredoc as before. The step after that computes the digest of the file, and the script compares it as before.

The run records which way the file was written. `body_transport` is `transcript` or `copied`, in the return value and in the run's row in `implement-runs.jsonl`, and a copy is also written to the run log.

### Consequences

- Good, because on Claude Code the body is written without a model copying it, which removes the cause of the three `pr-body-mismatch` stops of 2026-11-12
- Good, because the block is chosen by the digest of its decoded body, so a block from another run or an earlier body cannot be taken
- Good, because a host with no transcript, or a Claude Code release that moves it, falls back to the copy and is no worse off than before
- Bad, because the transcript path and the shape of its lines are Claude Code internals with no stated contract. A change there turns every run back into a copy, and only `body_transport` shows it
- Bad, because the base64 block stays in the prompt for the script to read, so the prompt is no shorter
- Neutral, because the body agent stays on sonnet for the case where it has to copy

### Confirmation

`workflows/implement/tests/write-body.test.ts` runs the script against transcripts built in a temp directory: it writes the body byte for byte from an indented prompt, takes the block with the wanted digest among several, writes nothing for another digest, ignores a block an assistant message quotes, and skips a transcript older than the window. `workflows/implement/tests/implement.behavior.test.js` runs the body step's own first command against a transcript holding that step's prompt, then the digest command, and checks that the run publishes and records `transcript`. It also runs the fallback block and checks `copied`. The script was run for real twice on 2026-11-12: against the transcript of the body agent that failed on Issue #167, where it recovered the 6,185-character body the workflow expected, and from inside a live subagent in a sandboxed session, where it found its own transcript while the agent was running.

## Pros and Cons of the Options

### Split the base64 into small chunks, each copied and verified by its own agent call

About ten lines per call, with a digest per chunk and a retry of the chunk that fails.

- Good, because it depends on nothing outside the workflow
- Bad, because a model still copies every character, so a chunk can fail any number of times
- Bad, because a 10 KB body takes about ten agent calls, each loading the shared context again

### Move the body generation into a bundled script that reads the review from the run's journal

The workflow stops generating the body, and a script rebuilds it from the accepted review that the journal recorded.

- Good, because the prompt no longer carries the body at all
- Bad, because the script could no longer compare the file against a body it generated, and the journal is as much an internal as the transcript
- Bad, because the body builder would exist twice or leave the workflow, and Codex's implement keeps it in the orchestrator

### Keep the single copy and resume from Ship on a mismatch

DR-0124 lets a `pr-body-mismatch` stop resume from Ship.

- Good, because it needs no change
- Bad, because the first copy failed in both bench runs, and the resume on Issue #167 failed again, so a publication costs a human decision more often than not

## More Information

Extends DR-0120 (`docs/decisions/0120-keep-the-implement-workflows-deviations-from-codexs-implement.md`). Its "PR body transport" row still describes the fallback: the base64 heredoc, the digest, and the sonnet agent. This record puts a step in front of it. Codex's implement writes the body directly and has no counterpart.

DR-0124 (`docs/decisions/0124-let-a-stopped-implement-run-resume-without-implementing-again.md`) names "the transport of the PR body stops going through an agent" as a reassessment trigger. That trigger is not met: the agent's copy remains as the fallback, and `pr-body-mismatch` keeps its resume from Ship.

Layout observed on Claude Code 2026-11-12: `$HOME/.claude/projects/<encoded cwd>/<session id>/subagents/workflows/<workflow run id>/agent-<id>.jsonl` for a workflow agent, and the same without `workflows/<workflow run id>/` for a subagent started by the Agent tool. The first line is the user message, and its content is the prompt with a harness frame line in front and every line of the computed text indented by two spaces.

### Reassessment Triggers

- `body_transport` is `copied` in a run on Claude Code, which means the transcript moved or changed shape
- A `pr-body-mismatch` stop occurs with `body_transport: transcript`, which means the stored prompt is not the prompt the script built
- Workflow scripts gain a way to write a file, at which point neither the transcript nor the copy is needed
- The scan of `$HOME/.claude/projects` takes long enough to matter. It took about one second over 1,042 project directories
