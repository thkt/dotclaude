---
status: "accepted"
date: "2026-11-12"
decision-makers: thkt
---

# Unwire every hook from settings.json

## Context and Problem Statement

DR-0122 left the Rust binary family unwired and kept the script hooks under `hooks/`: `settings.json` carried 28 handlers across `PreToolUse`, `PostToolUse`, `SessionStart`, `UserPromptSubmit`, `Stop` and `StopFailure`. By 2026-11-12 the working `settings.json` had `disableAllHooks: true`, so none of the 28 ran, while `docs/HOOKS.md`, `docs/SPEC.md` and six tests still described them as registered. The decision-maker wants to review which hooks earn a place before any runs again. Does the registration stay in `settings.json` behind a switch, or does it leave the file until that review picks what returns?

## Decision Drivers

- `disableAllHooks: true` also turns off the status line, which is not under review
- A registration that never runs reads as a live gate to anyone opening `settings.json` or the wiring tables
- Deleting a file was guarded by a hook that rewrote the command. A permission rule can deny the same commands without a process per Bash call
- Tree-rewriting git commands fail inside the sandbox in this repository, because the sandbox denies writes to `rules/`, `skills/`, `agents/`, `hooks/` and `workflows/`. A permission rule cannot move a command out of the sandbox
- The decision-maker judged the `WebFetch` / `WebSearch` deny and the `EnterPlanMode` deny as not worth a hook

## Considered Options

- Remove every hook registration and move the two guards that have a settings equivalent (chosen)
- Keep the registration and leave `disableAllHooks: true` in place
- Remove only the hooks judged unnecessary and re-enable the rest

## Decision Outcome

Chosen option: "Remove every hook registration and move the two guards that have a settings equivalent", because the decision-maker chose to start the review from an empty registration, and the two guards that protect files can be expressed in settings without a hook.

`settings.json` carries no `hooks` key and no `disableAllHooks` key. The `statusLine` registration stays. The scripts under `hooks/` and their tests stay in the tree, unwired. The one exception is `hooks/herdr-agent-state.sh`, which is removed together with the herdr hook integration.

| Guard                   | Before                                         | After                                                                                                                          |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Deletion                | `security/rm_to_trash.ts` rewrote the command  | `permissions.deny` lists `rm`, `rmdir`, `unlink`, `shred` and `find * -delete*`. `rules/core/OPERATION.md` names `trash <path>` |
| Tree-rewriting git here | `security/git_sandbox_guard.ts` denied the run | `sandbox.excludedCommands` in the untracked `.claude/settings.local.json` lists the tree-rewriting subcommands                 |

### Consequences

- Good, because the status line runs again and `settings.json` no longer shows a gate that does not run
- Good, because the deletion guard holds without a hook process on every Bash call
- Bad, because the deny rule matches a command by its text. `xargs rm`, `find -exec rm` and a script that deletes pass it, where the hook's token scan caught the first two
- Bad, because `sandbox.excludedCommands` covers a call only when every command in it matches. `cd <repo> && git checkout main` stays sandboxed, and the hook denied that form
- Bad, because nothing replaces the rest. A package install with lifecycle scripts enabled, a `gh issue create` body off the template, a client identifier in a filing, and a `.ja/` file that lost its Japanese prose all pass without a check at write time
- Bad, because `.ja/` Markdown is no longer auto-fixed by textlint on write. CI's `npx textlint '.ja/**/*.md'` reports the same findings later, on push
- Neutral, because the integrations stop too: the macOS keep-awake hold, the failure sound, the herdr agent state, the scribe prompt and the codegraph prompt context

### Confirmation

`node --test` over the repository's own test globs passes, plus `npx tsc`, `npx oxlint` and `npx biome lint`. `settings.json` parses, has no `hooks` key, and its `permissions.deny` lists the five deletion patterns. `docs/HOOKS.md` and `docs/SPEC.md` state in both trees that no hook is registered.

## Pros and Cons of the Options

### Keep the registration and leave `disableAllHooks: true` in place

Change nothing in `settings.json` and let the switch hold every hook off.

- Good, because turning the hooks back on is one key
- Good, because no test or document needs to change
- Bad, because the status line stays off for as long as the review takes
- Bad, because six tests keep asserting a registration that does not run

### Remove only the hooks judged unnecessary and re-enable the rest

Delete the two inline denies and turn `disableAllHooks` off.

- Good, because the guards with no settings equivalent keep running
- Bad, because it re-enables hooks the review has not looked at yet, which is the opposite of the order the decision-maker asked for

## More Information

Extends DR-0122 (`docs/decisions/0122-leave-the-quality-pipeline-binaries-entirely-unwired.md`) from the binary family to the script hooks, and does not supersede it. One of its Consequences no longer holds: `rust_pre_edit.ts` does not run clippy before a `.rs` write.

DR-0114 and DR-0116 decide how a hook script is written and where it sits. Neither depends on the script being registered, so they stay as they are.

Five tests named a script by reading its registration from `settings.json`. They now name the script by its tracked path and keep the exec-bit and shebang checks: T-291, T-311, T-327, T-374 and T-392. T-400 checked only the argv each event passed to the amphetamine hook, which exists only in a registration, and is removed.

`hooks/herdr-agent-state.sh` is removed at the decision-maker's instruction to drop the herdr hook integration. That meets DR-0117's third Reassessment Trigger, so DR-0117 is deprecated, and `workflows/_lib/tests/python-invocation-sweep.test.ts` drops the exclusion DR-0117 gave the file. The herdr installer wrote that file, so whether a herdr reinstall or update writes it and its `SessionStart` handler again is unconfirmed. The decision-maker stopped using herdr altogether, so the same change also removes the codex-herdr implementer from `workflows/code.js` and `workflows/build.js`: the `implementer` argument, the pane start and close, the `Implementer` commit trailer, and the `herdr_panes` field on both return values. The boolean check on a Red / Green result stays, and its stop is renamed from `courier-type-mismatch` to `result-type-mismatch`.

`rules/development/TOOLS.md` names the `use-cli-scout` skill as the first reach for web fetch and search, in place of the sentence that said a hook routes them.

`.claude/OUTCOME.md` names hooks among the quality gates in two Behaviors. That text is left for the review to settle.

### Deprecation Target

Every handler under `hooks` in `settings.json`, the `disableAllHooks` key, the two inline `echo` denies for `EnterPlanMode` and `WebFetch|WebSearch`, and the tracked `hooks/herdr-agent-state.sh`.

### Migration Plan

Deletion moves to `permissions.deny` and tree-rewriting git moves to `sandbox.excludedCommands`, as the table above records. Nothing else migrates. `docs/SPEC.md`'s wiring table and `docs/HOOKS.md`'s event map keep each script's last registration, so wiring one back starts from a recorded shape.

### Rollback Plan

thkt decides, and no date is set. The `hooks` block comes back from this change's parent commit of `settings.json`. A single hook returns as one object under its event, taken from the same commit or from `docs/SPEC.md`'s wiring table. The tests listed above would then read the registration again. `hooks/herdr-agent-state.sh` comes back from the same parent commit, or from a herdr reinstall.

### Reassessment Triggers

- A file is deleted through `xargs rm`, `find -exec rm` or a script, and the Trash does not hold it
- A git command leaves `HEAD` moved and the working tree behind in this repository, which means a call reached the sandbox in a form `sandbox.excludedCommands` does not cover
- A package install runs a lifecycle script that `npm_install_guard.ts` would have blocked
- An issue or pull request is filed with a client identifier, or with a body off the template, that the pre-bash gates would have stopped
- A `.ja/` file reaches a commit without Japanese prose, or CI's textlint step fails on a spacing fix the write-time hook used to apply
- The review picks hooks to wire back, at which point this record stops describing the configuration
