---
name: recall-search
description: Search past Claude Code/Codex sessions via recall CLI. Use when: 前に, あの時, また同じ, あの件, past decisions, recurring mistake, module first contact, BACKLOG task pickup, temporal reference, structural echo, vague back-reference.
allowed-tools: [Bash, Read]
user-invocable: false
---

# recall-search

## Triggers (call without deliberation)

| Trigger              | Signal                                    |
| -------------------- | ----------------------------------------- |
| Temporal reference   | 「前に」「あの時」 past events / decisions |
| Structural echo      | Current problem mirrors a past situation  |
| Repetition           | 「また同じ」 recurring mistake            |
| Vague back-reference | 「あの件」 past work without specifics    |
| Module first contact | First edit to a file/module this session  |
| BACKLOG task pickup  | Starting a task from BACKLOG.md           |

## Commands

| Purpose          | Command                                              |
| ---------------- | ---------------------------------------------------- |
| Search           | `recall "query"`                                     |
| Last N days      | `recall "query" --days N`                            |
| Project filter   | `recall "query" --project <path>`                    |
| Source filter    | `recall "query" --source claude` or `--source codex` |
| Reindex          | `recall --reindex`                                   |

## Parallel with yomu-search

Past decisions (recall-search) vs current code state (yomu-search). Run both in parallel on these triggers.

| Trigger              | recall query                  | yomu query                    |
| -------------------- | ----------------------------- | ----------------------------- |
| Module first contact | module name, design rationale | module name, related concepts |
| BACKLOG pickup       | task name, related decisions  | task-related code             |
| Structural echo      | past similar problem          | current similar code          |
