---
status: "accepted"
date: "2026-09-28"
decision-makers: thkt
---

# Keep the implement workflow's deviations from Codex's implement

## Context and Problem Statement

`workflows/implement.js` ports Codex's implement (`~/.agents`) so a Claude Code session can take an agreed Issue to a draft PR. It follows the Codex contracts for `.dotagents.json`, the research handoff, revision, and the CI wait. Four parts could not run as Codex writes them under Claude Code's auto mode and headless agents, and smoke runs on `thkt/dotagents-workflow-trial` found each failure. A later port that copies Codex again would bring those failures back, so which parts differ on purpose, and why?

## Decision Drivers

- The workflow runs in auto mode, and auto mode denies some command shapes that Codex relies on
- Agents transcribe command text, and an LLM transcription can change bytes, for example NFKC-folding half-width kana
- A human reads the published draft PR, and nothing gets published without the script's own gates
- Diffs from Codex stay small enough to re-sync when Codex changes

## Considered Options

- Keep these deviations, each one tied to a failure the smoke runs observed (chosen)
- Match Codex exactly and ask for permission prompts when auto mode denies a command
- Run the workflow with the sandbox and auto mode off

## Decision Outcome

Chosen option: "Keep these deviations", because each Codex shape failed in a Claude Code run, and each replacement keeps the check that Codex's shape was there for.

| Part | Codex | This workflow | Failure that forced it |
| --- | --- | --- | --- |
| Push | `pushArguments` pushes through a command-scoped remote URL and a replaced credential helper | Pushes to the configured remote. Right before the push, every effective push URL (`remote get-url --push --all`, `ls-remote --get-url`) must point at `repository` | Auto mode denied the command-scoped push as a remote repoint |
| CI wait | One wait inside a 540-second budget | `gh pr checks --watch` for at most 540 seconds per round, up to `CI_WAIT_ROUNDS = 6` rounds | The Bash tool's timeout caps one call, and a wait can return early, before any checks are registered |
| PR body transport | The body is written directly | The body goes to an agent as UTF-8 base64 in a heredoc to `base64 -d`, and the script compares an FNV-1a digest (`hex8:length`) of what was written. The body agent runs on sonnet | The agent rewrote half-width kana. With `\uXXXX` JSON, the agent then decoded the escapes and broke the shell |
| Path comparison | `git -c core.quotePath=false ls-tree` | Keeps git's default quoting, and compares against `gitQuoted(path)`, which quotes the same way | A non-interactive session denied `git -c` at the permission check |

The PR body is written in English, while Codex writes it in Japanese. The user chose that when the port was reviewed. It is a preference, not a forced deviation.

These parts were not ported: `report.html`, token usage reporting, the Japanese lint of the body, and `testing.md`.

### Consequences

- Good, because the whole flow runs in auto mode, and each denied shape has a replacement check in place of a permission prompt
- Bad, because a re-sync from Codex has to check these four places by hand
- Bad, because pushing to the configured remote trusts that remote's credential helper, where Codex replaced it

### Confirmation

`workflows/implement/tests/implement.behavior.test.js` runs the base64 transport and the digest for real, and checks the push-URL probe, the CI wait classification, and `gitQuoted`. Trial PR #150 on `thkt/dotagents-workflow-trial` was published as `published_draft` with CI green, and was then revised through the `revision` input.

## Pros and Cons of the Options

### Match Codex exactly and prompt on denial

- Good, because the port stays line-for-line with Codex
- Bad, because a headless workflow cannot answer a prompt, so the run stops at the push

### Run with the sandbox and auto mode off

- Good, because every Codex command shape runs
- Bad, because an unattended agent then runs without the safety boundary that the rest of the harness assumes

## More Information

Merged in PR #760 (commits `970c136e`, `39fb419d`). The reasons also sit next to the code, at the comments above the push probe and `CI_WAIT_ROUNDS`, and above `gitQuoted` in `workflows/implement.js`. #762 tracks a gap that Codex shares: unpushed local base commits enter the PR without review.

### Reassessment Triggers

- Auto mode allows the command-scoped push or `git -c`. The Codex shape can then come back
- The Bash tool's timeout grows past Codex's CI budget
- Codex changes `pushArguments`, `waitForCi`, or how it writes the body
