---
name: use-cli-scout
description: Web search, page fetch, and GitHub repo exploration via scout CLI.
when_to_use: web search, page fetch, deep research, GitHub repo exploration, latest docs, release notes, library docs, external info, WebFetch alternative, WebSearch alternative, 最新ドキュメント, リリースノート, 外部情報
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-scout

## Commands

| Purpose           | Command                                                             |
| ----------------- | ------------------------------------------------------------------- |
| Web search        | `scout search "query"`                                              |
| Language filter   | `scout search "query" --lang ja` or `--lang en`                     |
| Fetch page        | `scout fetch <url>`                                                 |
| Fetch (SPA)       | `scout fetch <url> --js`                                            |
| Fetch (raw)       | `scout fetch <url> --raw`                                           |
| Deep research     | `scout research "topic"`                                            |
| Research depth    | `scout research "topic" --depth N` (1-10, default 3)                |
| Repo tree         | `scout repo-tree <owner/repo>`                                      |
| Repo tree filter  | `scout repo-tree <owner/repo> --path <prefix>` / `--pattern <glob>` |
| Repo tree at ref  | `scout repo-tree <owner/repo> --ref <branch-or-tag-or-sha>`         |
| Repo read         | `scout repo-read <owner/repo> <path>`                               |
| Repo read lines   | `scout repo-read <owner/repo> <path> --lines 1-80`                  |
| Repo overview     | `scout repo-overview <owner/repo>`                                  |

## When to Use

| use-cli-scout                          | Built-in WebFetch / WebSearch      |
| ---------------------------------- | ---------------------------------- |
| Latest docs, release notes         | Never (scout preferred)            |
| GitHub repository exploration      | Never (scout repo-* preferred)     |
| Deep research with compiled report | Unavailable (use scout research)   |
| Markdown-clean page extraction     | WebFetch lacks Markdown conversion |

## Prerequisite

| Env Var        | Required | Purpose                              |
| -------------- | -------- | ------------------------------------ |
| GEMINI_API_KEY | Yes      | `scout search` / `scout research`    |
| GITHUB_TOKEN   | No       | Higher rate limit for `scout repo-*` |
