# Snapshot Schema

`/audit` 実行結果の canonical source。ADR 0047 を参照。

${CLAUDE_SKILL_DIR}/templates/output.md は snapshot から導出された render view。snapshot data に traceback できないフィールドは出力に出さない。

## Location

${CLAUDE_SKILL_DIR}/../../workspace/history/audit-YYYY-MM-DD-HHmmss.json

audit 実行 1 回につき 1 ファイル。ファイル名のタイムスタンプは UTC。

## トップレベルフィールド

| Field             | Type          | Required | 説明                                                    |
| ----------------- | ------------- | -------- | ------------------------------------------------------- |
| `session_id`      | string        | yes      | UUID. audit 開始時に Leader が取得                      |
| `timestamp`       | string        | yes      | ISO 8601. Leader が取得                                 |
| `branch`          | string        | yes      | audit 時点の git branch                                 |
| `target`          | string        | yes      | audit 対象スコープ。ファイル、SHA range、または記述     |
| `focus`           | enum          | yes      | `security` / `performance` / `quality` / `a11y` / `all` |
| `pre_flight`      | object        | yes      | Pre-flight を参照                                       |
| `raw_findings`    | array         | yes      | Raw Findings を参照                                     |
| `findings`        | array         | yes      | Finding Entry を参照                                    |
| `summary`         | object        | yes      | Summary を参照                                          |
| `pipeline_health` | object        | yes      | Pipeline Health を参照                                  |
| `delta_from`      | string / null | yes      | 前回 snapshot ファイル名、初回実行時は null             |
| `delta`           | object        | yes      | Delta を参照                                            |

## Pre-flight

| Field      | Type           | 説明                                                       |
| ---------- | -------------- | ---------------------------------------------------------- |
| `tests`    | object         | `{ total, pass, fail, ignored }`. test runner なしなら省略 |
| `build`    | enum           | `pass` / `fail` / `skipped`                                |
| `clippy`   | string         | `clean` / `N warnings` / `skipped`. Rust のみ              |
| `fmt`      | string         | `clean` / `N drifts` / `skipped`                           |
| `coverage` | enum or object | `skipped` または `{ c0: "N%", c1: "N%" }`                  |

## Raw Findings

challenge と dedupe 前の Wave 1 reviewer 出力。reconcile は per-reviewer の詳細を消す (dismissed findings は内容を失い、収束した findings は integrator が統合する)。2026-06-04 の pilot (`workspace/history/overlap-pilot-2026-06-04.md`) が transcript から復元するまで事後の overlap 計測は不可能だった。このセクションはそのデータを run ごとに参照可能な形で保持する。

各 Wave 1 reviewer が emit した finding ごとに 1 エントリ。`status` は持たない (reconcile 前のため)。

Trust boundary: このセクションは Leader (LLM) が転記する best-effort の便宜的 index であり、黙った欠損が起こり得るし完全性を検証する機構もない。authoritative source は session transcript (session jsonl 内の Task results) のまま。抽出手順は上記 pilot レポートにある。`raw_findings` を計測に使う前に、reviewer ごとのエントリ数を transcript と照合する。

| Field      | Type   | 説明                                                                                                             |
| ---------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `reviewer` | string | subagent_type (例: `reviewer-duplication`)                                                                       |
| `id`       | string | reviewer ローカル ID をそのまま (例: `DRY-001`)。integrator の再採番後 `findings` の ID とは一致しないことがある |
| `file`     | string | repo 相対パス + 行。Finding Entry と同じ形式                                                                     |
| `message`  | string | 1 行の主張。evidence と fix の詳細は除く                                                                         |

## Finding Entry

各エントリは個別にアドレッサブル。ID prefix registry は `finding-schema.md` にある。RC は Wave 1 reviewer-causation 出力と integrator 統合の両方をカバーする。

| Field      | Type     | Required | 説明                                                                    |
| ---------- | -------- | -------- | ----------------------------------------------------------------------- |
| `id`       | string   | yes      | `<PREFIX>-<NNN>`、prefix ごとに 1-based 連番                            |
| `severity` | enum     | yes      | `critical` / `high` / `medium` / `low`                                  |
| `category` | string   | yes      | 自由形式の記述子 (例: `structure/size`, `logging/format`)               |
| `file`     | string   | yes      | line 付きリポジトリ相対パス。`src/main.rs:42` または `src/lib.rs:10-24` |
| `message`  | string   | yes      | 具体 issue の 1 行記述                                                  |
| `status`   | enum     | yes      | Status を参照                                                           |
| `resolves` | string[] | optional | RC エントリのみ。この統合で解決される finding の ID                     |
| `effort`   | enum     | optional | `5min` / `15min` / `30min` / `1h` / `manual`. RC と auto-fix 候補向け   |
| `fix_type` | enum     | optional | `auto` / `manual`. 既知の fix パターンが曖昧さなく当てはまれば `auto`   |

### Status

| 値              | 意味                                                                                    |
| --------------- | --------------------------------------------------------------------------------------- |
| `open`          | Wave 1 raw、未 reconcile                                                                |
| `confirmed`     | reconcile 済み、evidence が保持を支持                                                   |
| `dismissed`     | challenger が拒否 (false positive)                                                      |
| `needs_review`  | challenger が異議、verifier が検証。人間判断が必要                                      |
| `needs_context` | 弱い evidence + budget 枯渇                                                             |
| `static`        | deterministic ツールからの PF finding。challenger/verifier をスキップ; 機械的に確認済み |

## Summary

| Field            | Type | 説明                                                                    |
| ---------------- | ---- | ----------------------------------------------------------------------- |
| `total_findings` | int  | `{open, confirmed, needs_review}` の finding 数 (Wave 1、`static` 除外) |
| `critical`       | int  | severity カウント。0 なら行を省略                                       |
| `high`           | int  | severity カウント。0 なら行を省略                                       |
| `medium`         | int  | severity カウント。0 なら行を省略                                       |
| `low`            | int  | severity カウント。0 なら行を省略                                       |
| `dismissed`      | int  | challenger が dismiss した finding 数                                   |
| `static_count`   | int  | status `static` の finding 数 (PF のみ)                                 |
| `trust_score`    | int  | 0-100. Trust Score を参照                                               |

### Trust Score

0-100. Wave 1 findings に対する優先度加重 convergence スコア。integrator の confidence floor (0.60)、`severity_upgraded` audit trail、cross-domain 再評価を使う。`2× medium` で `high` を正当化しない。カウント単独で severity を上げることはない。式の詳細は integrator 実装。この schema は int 0-100 のみ要求する。

## Pipeline Health

| Field                  | Type     | 説明                                                |
| ---------------------- | -------- | --------------------------------------------------- |
| `reviewers_completed`  | int      | 完了した reviewer エージェント数                    |
| `root_cause_completed` | bool     | RC reviewer phase の完了                            |
| `challenger_completed` | bool     | challenger phase の完了                             |
| `verifier_completed`   | bool     | verifier phase の完了                               |
| `integrator_completed` | bool     | integrator phase の完了                             |
| `domains_skipped`      | string[] | `<domain>: <reason>` のリスト。Skipped Domains 参照 |

### Skipped Domains

`domains_skipped` の各エントリは `<domain>: <reason>` 形式に従う。各エントリは当該 reviewer の findings がこの audit に存在しないことを示す。理由は `SKILL.md` の Error Handling 表に従う (`timeout`, `malformed_output`, `dependency_stall: {upstream}`)。`output.md` の `Skipped reviewers` サブセクションでユーザーに表示する。

## Delta

| Field               | Type       | 説明                                    |
| ------------------- | ---------- | --------------------------------------- |
| `tests`             | string     | `N → N` または `unchanged`              |
| `clippy`            | string     | `N warnings → 0` または `unchanged`     |
| `fmt`               | string     | `N drifts → 0` または `unchanged`       |
| `trust_score`       | string     | `N → N` または `unchanged`              |
| `critical`          | string     | `+N`, `-N`, `0`、初回実行時は `(first)` |
| `high`              | string     | critical と同形式                       |
| `medium`            | string     | critical と同形式                       |
| `low`               | string     | critical と同形式                       |
| `findings_new`      | int        | 今回ありで前回ない finding 数           |
| `findings_resolved` | int        | 前回ありで今回ない finding 数           |
| `findings_prior`    | int / null | 前回 total、初回実行時は null           |

## Responsibility Split

| セクション                                             | 担当                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `session_id`, `timestamp`, `branch`, `target`, `focus` | audit 開始時の Leader                                             |
| `pre_flight`                                           | test runner と hook 出力からの Leader                             |
| `raw_findings`                                         | challenger/verifier spawn 前に各 Wave 1 Task result からの Leader |
| `findings`, `summary`, `pipeline_health`               | Integrator                                                        |
| `delta_from`, `delta`                                  | 前回 snapshot との比較で Leader                                   |

## 例

${CLAUDE_SKILL_DIR}/templates/snapshot.json を参照。
