---
name: yomu-search
description: Semantic code search (concept/identifier/related) for TS/JSX/CSS/HTML/Rust/Markdown via yomu CLI. Use when: concept search, identifier lookup, related code, 意味検索, 概念検索, hooks that do Y, where does X happen, unknown identifier.
allowed-tools: [Bash, Read]
user-invocable: false
---

# yomu-search

## Commands

| Purpose          | Command                                 |
| ---------------- | --------------------------------------- |
| Semantic search  | `yomu search "query"`                   |
| JSON output      | `yomu search "query" --json`            |
| Impact analysis  | `yomu impact <file-or-symbol>`          |
| Index status     | `yomu status`                           |

## When to Use

| yomu-search                              | Grep / Glob                             |
| ---------------------------------------- | --------------------------------------- |
| Concept: "form validation", "auth flow"  | Literal string or regex                 |
| Related: "hooks that do Y"               | Known path: `src/components/Button.tsx` |
| Unknown identifier: "where does X happen"| File glob: `**/*.tsx`                   |
| TS/JSX/CSS/HTML/Rust/Markdown            | Swift / Python / Go / other             |

## Prerequisite

Run `yomu status` first. If index missing → `yomu rebuild` then `yomu index`.
