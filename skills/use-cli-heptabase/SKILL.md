---
name: use-cli-heptabase
description: Read and write Heptabase cards, journals, notes, tags, and AI Tutor data via heptabase CLI. All output is JSON.
when_to_use: Heptabase, ヘプタベース, card library, カード, note card, ノートカード, journal entry, ジャーナル, AI Tutor, タグ管理, knowledge base write, ナレッジベース書き込み
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-heptabase

Heptabase CLI (`heptabase`, v0.1.0+). Desktop app must be running with CLI enabled (Settings → AI Features → CLI).

## Prerequisite

Run `heptabase start` first.

| Output | Meaning |
| --- | --- |
| `{"status":"ready",...}` | Server up. Proceed |
| Hangs / non-JSON | Desktop app closed or CLI toggle off |

Electron writes a harmless warning to stderr on every invocation. Suppress with `2>/dev/null` when parsing.

## Commands

| Purpose | Command |
| --- | --- |
| Server ready check | `heptabase start` |
| List / search cards | `heptabase card list --limit N --offset M` |
| Trash / restore card | `heptabase card trash <id>` / `heptabase card restore <id>` |
| Create note (markdown) | `heptabase note create` (first `# heading` = title) |
| Read note | `heptabase note read <cardId>` |
| Append note (markdown) | `heptabase note append <cardId>` |
| Replace note (ProseMirror JSON) | `heptabase note save <cardId>` (needs `contentMd5` from read) |
| Journal CRUD by date | `heptabase journal create|read|append|save <date>` |
| Tag list / create / add / remove | `heptabase tag list|create|add|remove` |
| Cards under a tag | `heptabase tag cards <tagId>` |
| AI Tutor goals / courses / lessons | `heptabase goal|course|lesson ...` (read-only) |

Run `heptabase <sub> -h` for argument details (flags vary per subcommand).

## Content Format

| Operation         | Format                                                      |
| ----------------- | ----------------------------------------------------------- |
| create / append   | Markdown                                                    |
| read              | ProseMirror JSON (returns `contentMd5`)                     |
| save              | ProseMirror JSON (requires latest `contentMd5` from `read`) |

## When to Use

| use-cli-heptabase | Alternative |
| --- | --- |
| Write back to knowledge base (journal append, note create) | Local markdown repo edit |
| Card library lookup by title / recency | yomu (code), kiku (Slack) |
| AI Tutor course / lesson / chat read | n/a |

## Warm-up (first use in session)

1. `heptabase start` returns `{"status":"ready"}`
2. `heptabase card list --limit 3` for read smoke test
3. Use `-h` on any subcommand before first write
