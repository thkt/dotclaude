# Audit Output Template

出力は `snapshot.json` (canonical source。ADR 0047 と `references/snapshot-schema.md` を参照) から render される。
以下のすべての値は snapshot field に traceback できる。snapshot 起源のないデータを出力に出さない。Leader が render を orchestrate し、integrator が snapshot を埋める。

## Template

```markdown
# Audit Report

## Pre-flight

| Check    | Status                                           | Delta          |
| -------- | ------------------------------------------------ | -------------- |
| Build    | {pre_flight.build}                               | -              |
| Clippy   | {pre_flight.clippy}                              | {delta.clippy} |
| Fmt      | {pre_flight.fmt}                                 | {delta.fmt}    |
| Tests    | {pre_flight.tests.pass}/{pre_flight.tests.total} | {delta.tests}  |
| Coverage | {pre_flight.coverage}                            | -              |

snapshot field が `skipped` で delta が `-` の行は省略する。

## Summary

| Severity | Count              | Delta            |
| -------- | ------------------ | ---------------- |
| Critical | {summary.critical} | {delta.critical} |
| High     | {summary.high}     | {delta.high}     |
| Medium   | {summary.medium}   | {delta.medium}   |
| Low      | {summary.low}      | {delta.low}      |

Trust Score: {summary.trust_score} / 100
FP rate: {summary.dismissed} / ({summary.total_findings} + {summary.dismissed}) dismissed by challenger

> Pipeline: {pipeline_health.reviewers_completed} reviewers completed
>
> Skipped reviewers (no findings reported for these areas):
>
> - {domains_skipped[i]} (1 エントリ 1 bullet。形式 `<domain>: <reason>`)
>
> `domains_skipped` が空かつ全 `*_completed` が true なら blockquote 全体を省略する。
> `domains_skipped` が空でも `*_completed` のいずれかが false なら "Skipped reviewers" subsection だけを省略する。

---

## Root Causes

id が `RC-` で始まる finding ごとに 1 行。

| ID                | Description            | Findings resolved       | Effort                |
| ----------------- | ---------------------- | ----------------------- | --------------------- |
| {findings[RC].id} | {findings[RC].message} | {findings[RC].resolves} | {findings[RC].effort} |

`Findings resolved` と `Effort` は RC-* エントリで integrator が補う。
`RC-` で始まる finding がなければセクションを省略する。

---

## Quick Fixes

auto-applicable な提案ごとに 1 行。Auto-fix 候補は `fix_type: auto`、`status: open | confirmed`、`severity: low | medium` の finding。
integrator が既知の fix パターンが曖昧さなく当てはまるとき (典型的には 1 行置換) snapshot.json で `fix_type` を設定する。

| ID                  | Location              | Effort  | Rationale                |
| ------------------- | --------------------- | ------- | ------------------------ |
| {findings[auto].id} | {findings[auto].file} | 5-15min | {findings[auto].message} |

適用: `/fix <ID>`. auto-fix 候補なしならセクションを省略する。

---

## Static Tool Findings

deterministic ツール (oxlint, knip, tsgo, react-doctor) からの finding。challenger/verifier をバイパスする。ツール出力が evidence。同じ `file:line` の Wave 1 finding はシグナルを強化し、次セクションで cross-reference 付きで現れる。

| ID                | Severity                | Category                | Location            |
| ----------------- | ----------------------- | ----------------------- | ------------------- |
| {findings[PF].id} | {findings[PF].severity} | {findings[PF].category} | {findings[PF].file} |

`status: static` の finding がなければセクションを省略する。

---

## Confirmed Findings

`status: confirmed` の全 finding。severity 降順でソート。

| ID               | Severity               | Category               | Location           |
| ---------------- | ---------------------- | ---------------------- | ------------------ |
| {findings[*].id} | {findings[*].severity} | {findings[*].category} | {findings[*].file} |

---

## Needs Review

challenger が異議、verifier が検証。人間判断が必要。

| ID                | Location            | Reason                 |
| ----------------- | ------------------- | ---------------------- |
| {findings[nr].id} | {findings[nr].file} | {findings[nr].message} |

この状態の finding がなければセクション全体を省略する。

---

## Actions

audit スコープとの関係で finding をグルーピングする。デフォルトポリシー。merge 前に in-scope finding をすべて解決し、本当に外部にあるもののみ defer する。リストが空の行は省略する。

### In scope (resolve before merge)

| Tier       | 基準                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| Must-fix   | critical/high severity; security (任意 severity); fail-state pre_flight; broken tests |
| Should-fix | audit スコープ内ファイルの medium/low severity                                        |

### Out of scope

| Tier     | 基準                                                              |
| -------- | ----------------------------------------------------------------- |
| Followup | `finding.file` が audit スコープ外 (副次的発見)                   |
| Discard  | レビュー後に false positive と確認                                |

ルーティングルール。Leader は各 finding の `file` を audit スコープと照合して配置する。In-scope finding は severity で Must-fix と Should-fix に分割。Out-of-scope finding は Followup へ。Discard は明示的なユーザー判断が必要。

各 tier 内のソート。優先度スコア降順。integrator は RC エントリでは `findings_resolved × max_severity × fixability`、独立 finding では `Impact × Reach × Fixability` で計算する。

---

## Fix Cycle

1. 適用: `/fix <ID>` (上の Quick Fixes)
2. 修正ファイルを再 audit: `/audit <modified files>`
3. 満足するまで繰り返す
```

## Rendering Rules

| ルール             | 詳細                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| Canonical source   | `snapshot.json` のみ。snapshot に存在しないフィールドは render しない。 |
| Delta フォーマット | 正なら `+N`、負なら `-N`、ゼロなら `-`、初回実行時は `(first)`          |
| Severity 順        | critical → high → medium → low                                       |
| Section 省略       | per-section ルールを参照; 空表は出さない                                |
| Trust Score range  | 0-100. 導出は `references/snapshot-schema.md` を参照                    |

## First Recording

`delta_from` が null (初回実行) のとき、すべての Delta 列に `(first)` を表示する。
