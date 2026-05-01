---
name: use-cli-recall
description: Search past Claude Code/Codex sessions via recall CLI.
when_to_use: 前に, あの時, また同じ, あの件, past decisions, recurring mistake, module first contact, BACKLOG task pickup, temporal reference, structural echo, vague back-reference
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-recall

## Triggers (call without deliberation)

| Trigger              | Signal                                     |
| -------------------- | ------------------------------------------ |
| Temporal reference   | 「前に」「あの時」 past events / decisions |
| Structural echo      | Current problem mirrors a past situation   |
| Repetition           | 「また同じ」 recurring mistake             |
| Vague back-reference | 「あの件」 past work without specifics     |
| Module first contact | First edit to a file/module this session   |
| BACKLOG task pickup  | Starting a task from BACKLOG.md            |

## Commands

| Purpose          | Command                                                     |
| ---------------- | ----------------------------------------------------------- |
| Search           | `recall search "query"` (or `recall "query"` as shorthand)  |
| Last N days      | `recall search "query" --days N`                            |
| Project filter   | `recall search "query" --project <path>`                    |
| Source filter    | `recall search "query" --source claude` or `--source codex` |
| Limit results    | `recall search "query" --limit N` (default 10, max 100)     |
| Show session     | `recall show <session-id>`                                  |
| Status           | `recall status`                                             |
| Incremental index| `recall index`                                              |
| Full rebuild     | `recall index --force`                                      |

## Parallel with use-cli-yomu

Past decisions (use-cli-recall) vs current code state (use-cli-yomu). Run both in parallel on these triggers.

| Trigger              | recall query                  | yomu query                    |
| -------------------- | ----------------------------- | ----------------------------- |
| Module first contact | module name, design rationale | module name, related concepts |
| BACKLOG pickup       | task name, related decisions  | task-related code             |
| Structural echo      | past similar problem          | current similar code          |
