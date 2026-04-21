# Audit 出力テンプレート

出力は `snapshot.yaml`（canonical — ADR 0047 参照）から render される。
下記の値はすべて snapshot フィールドに対応する — snapshot に存在しないデータを
出力してはならない。Leader が render を統括、integrator が snapshot を fill する。

## テンプレート

```markdown
# Audit Report

## Pre-flight

| Check    | Status                                       | Delta                           |
| -------- | -------------------------------------------- | ------------------------------- |
| Build    | {pre_flight.build}                           | -                               |
| Clippy   | {pre_flight.clippy}                          | {delta.clippy}                  |
| Fmt      | {pre_flight.fmt}                             | {delta.fmt}                     |
| Tests    | {pre_flight.tests.pass}/{pre_flight.tests.total} | {delta.tests}               |
| Coverage | {pre_flight.coverage}                        | -                               |

snapshot が `skipped` かつ Delta が `-` の行は省略する。

## Summary

| Severity | Count              | Delta             |
| -------- | ------------------ | ----------------- |
| Critical | {summary.critical} | {delta.critical}  |
| High     | {summary.high}     | {delta.high}      |
| Medium   | {summary.medium}   | {delta.medium}    |
| Low      | {summary.low}      | {delta.low}       |

Trust Score: {summary.trust_score} / 100
FP率: {summary.dismissed} / ({summary.total_findings} + {summary.dismissed}) が challenger により棄却

> Pipeline: {pipeline_health.reviewers_completed} reviewers completed |
> Skipped: {pipeline_health.domains_skipped}
>
> （`domains_skipped` が空で全 `*_completed` が true ならこの blockquote 省略）

---

## Root Causes

id が `RC-` で始まる finding ごとに 1 行。

| ID                | Description            | Findings resolved       | Effort                |
| ----------------- | ---------------------- | ----------------------- | --------------------- |
| {findings[RC].id} | {findings[RC].message} | {findings[RC].resolves} | {findings[RC].effort} |

`Findings resolved` と `Effort` は integrator が RC-* エントリに付加するフィールド。
`RC-` で始まる finding がなければこのセクションごと省略。

---

## Quick Fixes

auto-fix 候補は `status: open`、severity が `low` or `medium`、file が単一行指定の findings。

| ID                  | Location              | Effort     | Rationale                |
| ------------------- | --------------------- | ---------- | ------------------------ |
| {findings[auto].id} | {findings[auto].file} | 5-15min    | {findings[auto].message} |

適用: `/fix <ID>`。auto-fix 候補なしなら省略。

---

## Confirmed Findings

`status: confirmed` の全 finding、severity 降順。

| ID               | Severity               | Category               | Location           |
| ---------------- | ---------------------- | ---------------------- | ------------------ |
| {findings[*].id} | {findings[*].severity} | {findings[*].category} | {findings[*].file} |

---

## Needs Review

challenger が異議、verifier が検証 — 人間判断要のもの。

| ID                | Location             | Reason                 |
| ----------------- | -------------------- | ---------------------- |
| {findings[nr].id} | {findings[nr].file}  | {findings[nr].message} |

このステートの finding が 0 件ならセクションごと省略。

---

## Actions

timing でグループ化。リストが空の行は省略。

| Priority         | Action                                                |
| ---------------- | ----------------------------------------------------- |
| [!] Immediate    | critical/high findings または fail-state pre_flight   |
| [→] This Sprint  | medium findings + auto-fixes                          |
| [→] Next Sprint  | low findings または構造的なリファクタ                 |
| [○] Backlog      | 軽微な改善、priority score < 5                        |

---

## Fix Cycle

1. 適用: `/fix <ID>`（上記 Quick Fixes）
2. 修正ファイルを再 audit: `/audit <modified files>`
3. 納得するまで繰り返し
```

## Render ルール

| ルール              | 詳細                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| Canonical source    | `snapshot.yaml` のみ。snapshot に存在しないフィールドを render しない |
| Delta 表記          | `+N` (増)、`-N` (減)、`-` (0)、初回は `(first)`                       |
| Severity 順         | critical → high → medium → low                                         |
| セクション省略      | 各セクションのルール参照。空テーブルは出さない                         |
| Trust Score 値域    | 0-100、ADR 0035 準拠                                                   |

## 初回記録

`delta_from` が null (初回 run) なら、全 Delta 列を `(first)` と表示。
