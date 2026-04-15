---
name: scout
description: >
  Read-through scan wrapper. Invokes scouting-anomalies on a file or glob.
  Use when user mentions /scout, scout, 通読スキャン, read-through, 違和感拾い,
  気になるとこ洗い出し. Do NOT use for full audit (use /audit) or PR screening
  (use /preview).
aliases: [read-through]
allowed-tools: [Skill, Read, Glob, AskUserQuestion]
argument-hint: "[path or glob]"
user-invocable: true
---

# /scout - Read-through Scanner

`scouting-anomalies` のラッパー。

## Execution

| Step | Action                                                 |
| ---- | ------------------------------------------------------ |
| 1    | `$1` を glob 展開 (空なら AskUserQuestion で scope 確認) |
| 2    | Skill `scouting-anomalies` 呼び出し                    |
| 3    | サマリー表示                                           |

## Output

| Metric           | Value                                      |
| ---------------- | ------------------------------------------ |
| files_scanned    | count                                      |
| anomalies_raised | count (Filter 前)                          |
| anomalies_staged | count (post-filter)                        |
| filter_skipped   | count                                      |
| reviewer_fit     | prefix 出現回数 + `[]` 件数                |
| staging_path     | `$HOME/.claude/workspace/scout/staging.md` |

恒等: `raised = staged + skipped`。reviewer_fitはprefix単位集計 (1 entryに複数prefixあり得る)。
