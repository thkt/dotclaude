---
name: yomu-search
description: Semantic code search (concept/identifier/related) for TS/JSX/CSS/HTML/Rust/Markdown via yomu CLI. Use when: concept search, identifier lookup, related code, 意味検索, 概念検索, hooks that do Y, where does X happen, unknown identifier.
allowed-tools: [Bash, Read]
user-invocable: false
---

# yomu-search

## Commands

| Purpose           | Command                                                   |
| ----------------- | --------------------------------------------------------- |
| Semantic search   | `yomu search "query"`                                     |
| JSON output       | `yomu search "query" --json`                              |
| Limit / offset    | `yomu search "query" --limit N --offset M`                |
| Path filter       | `yomu search "query" --path <prefix>` (repeatable)        |
| Find similar      | `yomu search --from <file>` or `--from <file>:<symbol>`   |
| Impact (file)     | `yomu impact <file>` (relative to project root)           |
| Impact (symbol)   | `yomu impact <file> --symbol <name>`                      |
| Impact (semantic) | `yomu impact <file> --semantic`                           |
| Index status      | `yomu status`                                             |
| Incremental index | `yomu index`                                              |
| Full rebuild      | `yomu rebuild`                                            |
| Embed pending     | `yomu embed` (required for semantic search)               |

## When to Use

| yomu-search                              | Grep / Glob                             |
| ---------------------------------------- | --------------------------------------- |
| Concept: "form validation", "auth flow"  | Literal string or regex                 |
| Related: "hooks that do Y"               | Known path: `src/components/Button.tsx` |
| Unknown identifier: "where does X happen"| File glob: `**/*.tsx`                   |
| TS/JSX/CSS/HTML/Rust/Markdown            | Swift / Python / Go / other             |

## Prerequisite

Run `yomu status` first.

| State                   | Action                         |
| ----------------------- | ------------------------------ |
| Index missing           | `yomu rebuild` → `yomu embed`  |
| Pending chunks to embed | `yomu embed`                   |
| Stale after edits       | `yomu index` → `yomu embed`    |
