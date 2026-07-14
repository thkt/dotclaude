---
name: use-cli-scout
description: Web search, page fetch, and GitHub repo exploration via scout CLI.
when_to_use: web search, page fetch, deep research, GitHub repo exploration, latest docs, release notes, library docs, external info, WebFetch alternative, WebSearch alternative, 最新ドキュメント, リリースノート, 外部情報
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-scout

## Commands

Run `scout <subcommand> --help` for options, `--json` envelope, exit codes, stdin input, and examples. The help output is the authoritative source for the installed version.

| Purpose       | Command                               |
| ------------- | ------------------------------------- |
| Web search    | `scout search "query"`                |
| Fetch page    | `scout fetch <url>`                   |
| Deep research | `scout research "topic"`              |
| Repo tree     | `scout repo-tree <owner/repo>`        |
| Repo read     | `scout repo-read <owner/repo> <path>` |
| Repo overview | `scout repo-overview <owner/repo>`    |

## When to Use

| use-cli-scout                      | Built-in WebFetch / WebSearch      |
| ---------------------------------- | ---------------------------------- |
| Latest docs, release notes         | Never; scout preferred             |
| GitHub repository exploration      | Never; scout repo-\* preferred     |
| Deep research with compiled report | Unavailable; use scout research    |
| Markdown-clean page extraction     | WebFetch lacks Markdown conversion |

## Prerequisite

| Env Var        | Required | Purpose                              |
| -------------- | -------- | ------------------------------------ |
| GEMINI_API_KEY | Yes      | `scout search` / `scout research`    |
| GITHUB_TOKEN   | No       | Higher rate limit for `scout repo-*` |
