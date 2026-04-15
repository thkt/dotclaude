---
name: scouting-anomalies
description: >
  File-by-file read-through diagnostic to surface anomalies that fixed
  checklists miss. Use when: 通読, 違和感, 読み通し, 気になるとこ, read-through,
  anomaly scout, file-by-file review. Do NOT use for full audit (use /audit),
  PR screening (use /preview), or readability review (use reviewing-readability).
allowed-tools: [Read, Grep, Glob, Write]
context: fork
user-invocable: false
---

# Scouting Anomalies

Read-through diagnostic. Staging行き、audit直結しない。

## Process

| Step | Action                                                                        |
| ---- | ----------------------------------------------------------------------------- |
| 1    | 対象ファイルを 1 つずつ通読 (Read, ±20 lines)                                 |
| 2    | 違和感候補を文字化 (1 行要約 + `file:line`)                                   |
| 3    | Filter 適用 (下表)                                                            |
| 4    | 該当 reviewer の ID prefix 配列 + 該当 Category を分類                        |
| 5    | staging 追記 (`$HOME/.claude/workspace/scout/staging.md`。無ければ mkdir -p) |

## Calibration

Yes/YesのみSTAGE、それ以外SKIP。

| Filter          | Question                                                        |
| --------------- | --------------------------------------------------------------- |
| Senior Engineer | Would a senior engineer request a change?                       |
| Harm            | Concrete trigger for bug/data loss/security/maintenance burden? |

## Staging Schema

正本: `../../templates/scout/read-through-staging.md`

| Field                 | Value                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------- |
| severity              | critical / high / medium / low                                                          |
| evidence              | `file:line` + observation                                                               |
| reasoning             | concrete language                                                                       |
| existing-reviewer-fit | ID prefix 配列 (例: `[CQ, PQ]`)。該当なしは `[]`                                      |
| category-in-reviewer  | 該当 reviewer の Category (例: PQ の `clarity`、CQ の `readability`)。該当なしは `none` |

ID prefixとCategoryは `../../templates/audit/finding-schema.md` のRegistryと各reviewer定義を参照。Language Constraintsも準拠。
