# 標準 Finding スキーマ

すべての監査サブレビュアーに必要な基本フィールド。Leader（Medium
tier）またはIntegrator（Large
tier）が統合時にドメイン固有の拡張フィールドを正規化する。

## 基本フィールド（必須）

FindingごとにMarkdown見出し + 単一テーブルで出力:

### {PREFIX}-{seq}

| フィールド   | 値                             |
| ------------ | ------------------------------ |
| Agent        | reviewer-name                  |
| Severity     | critical / high / medium / low |
| Category     | ドメイン固有のカテゴリ         |
| Location     | `file:line`                    |
| Confidence   | 0.60–1.00                      |
| Evidence     | コードスニペットまたは観察事項 |
| Reasoning    | なぜこれが問題なのか           |
| Fix          | 修正案                         |
| Verification | チェック種別 — 質問            |

### Confidence 下限

- レビュアーはconfidence < 0.60のfindingを含めてはならない
- confidenceを評価できない場合は0.60をデフォルトとする
- security-reviewerは独自の定義でより厳格な閾値を設定可能

## Calibration 原則

findingを報告する前に、以下のフィルタを順に適用する。いずれかで除外される場合、
報告しない。

### フィルタ 1: シニアエンジニアテスト

シニアエンジニアがコードレビューで指摘し、変更を求めるか？「好みによる」または
「これではPRをブロックしない」なら除外。

### フィルタ 2: 実害テスト

このコードがバグ、データ損失、セキュリティ問題、またはメンテナンスコストを引き起こす
具体的なシナリオを説明できるか？「理論的に問題になり得る」は具体的ではない。
トリガー条件を特定すること。

### フィルタ 3: コンテキストテスト

| コンテキスト | アクション                                                    |
| ------------ | ------------------------------------------------------------- |
| コールドパス | severity >= high でない限り除外                               |
| 意図的       | コメント、エラーメッセージ、命名が意図を示す → 除外          |
| FWイディオム | フレームワーク/ライブラリの慣習に従っている → 除外           |
| 間接カバー   | 呼び出し元やインテグレーションテストでテスト済み → 除外 (TC) |
| 意味的差異   | 構造は類似だがビジネスロジックが異なる → 除外 (DRY)          |

### フィルタ 4: 修正の釣り合い

修正コストはリスクに見合うか？低severityの問題に大規模リファクタリングが
必要なら、informationalに格下げするか除外。

各レビュアーのCalibrationセクションにドメイン固有のREPORT/SKIP例がある。
迷ったらSKIPを選ぶ — false negativeはchallengerが拾うが、
false positiveはパイプライン全体のコストを増やす。

## 概要テーブル

複数のfindingがある場合、先頭にサマリーテーブルを付ける:

| ID  | Severity | Category | Location | Confidence |
| --- | -------- | -------- | -------- | ---------- |

## ドメイン固有の拡張フィールド（統合時に正規化）

以下に記載のないレビュアーは基本フィールドのみ使用。

| レビュアー             | 追加フィールド                                       | 必須/任意 | 正規化ルール                                                      |
| ---------------------- | ---------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| root-cause-reviewer    | five_whys, root_cause                                | 必須      | root_cause → reasoning; five_whys → evidence に追記               |
| progressive-enhancer   | recommendations                                      | 必須      | 個別項目として追記                                                |
| code-quality-reviewer  | subcategory                                          | 任意      | category に category/subcategory として追記                       |
| performance-reviewer   | impact                                               | 任意      | evidence に追記; impact → reasoning のメモとして追記              |
| accessibility-reviewer | wcag (必須), apg_pattern (必須), code_example (任意) | 必須/任意 | wcag → evidence; apg_pattern, code_example → fix のコンテキスト   |
| test-coverage-reviewer | related_code, criticality                            | 任意      | related_code → evidence; criticality → reasoning のメモとして追記 |
| type-design-reviewer   | type_name, scores                                    | 任意      | evidence に追記; scores → reasoning のメモとして追記              |
| security-reviewer      | entry_points (hint 内)                               | 任意      | verification_hint 内に含まれる                                    |
| subagent-reviewer      | (なし)                                               | —         | 正規化不要                                                        |

## ID プレフィックス一覧

| プレフィックス | レビュアー                                |
| -------------- | ----------------------------------------- |
| SEC            | security-reviewer                         |
| SF             | silent-failure-reviewer                   |
| TS             | type-safety-reviewer                      |
| TD             | type-design-reviewer                      |
| CQ             | code-quality-reviewer                     |
| PE             | progressive-enhancer                      |
| RCA            | root-cause-reviewer                       |
| DP             | design-pattern-reviewer                   |
| TEST           | testability-reviewer                      |
| TC             | test-coverage-reviewer                    |
| PERF           | performance-reviewer                      |
| A11Y           | accessibility-reviewer                    |
| DRY            | duplication-reviewer                      |
| DOC            | document-reviewer                         |
| SA             | subagent-reviewer                         |
| OPS            | operational-readiness-reviewer            |
| SOW            | sow-spec-reviewer                         |
| PF             | pre-flight (エージェントファイルではない) |

## 統合ルール

同一パターンが複数箇所に出現する場合:

- 単一のfindingとして報告
- evidenceにすべての箇所を記載（最大5件、超過分は「他N件」）
- severityは全出現箇所の中でもっとも高いものを設定

例:「7ファイルで未使用import」→ 1件のfinding、severityは最悪ケースから
