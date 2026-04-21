# 標準 Finding スキーマ

すべての監査サブレビュアーに必要な基本フィールド。Leader（Medium tier）または Integrator（Large tier）が統合時にドメイン固有の拡張フィールドを正規化する。

## 基本フィールド（必須）

Finding ごとに Markdown 見出しに続けて単一のテーブルを出力する。

### {PREFIX}-{seq}

| フィールド   | 値                             | 出典        |
| ------------ | ------------------------------ | ----------- |
| Agent        | reviewer-name                  | auto-filled |
| Severity     | critical / high / medium / low | reviewer    |
| Category     | ドメイン固有のカテゴリ         | reviewer    |
| Location     | `file:line`                    | reviewer    |
| Evidence     | コードスニペットまたは観察事項 | reviewer    |
| Trigger      | 問題が顕在化する具体的な条件   | reviewer    |
| Reasoning    | なぜこれが問題なのか           | reviewer    |
| Fix          | 修正案                         | reviewer    |
| Verification | チェック種別 — 質問            | reviewer    |

### Agent (auto-fill)

Integrator/Leader が Agent フィールドを spawning reviewer の `name:` frontmatter から自動入力する。レビュアーは自身の name を出力に含めてはならない — Agent 行自体を省略すること。

### Trigger vs Reasoning

これらは別のフィールド。マージしてはならない。

| フィールド | 質問           | 例                                                                               |
| ---------- | -------------- | -------------------------------------------------------------------------------- |
| Trigger    | いつ発火する？ | "Bash tool 呼び出しのたび（PreToolUse hook が毎回実行）"                         |
| Reasoning  | なぜ問題？     | "awk fork+exec がホットパスで 2-5ms かかる。case フィルタの短絡判定より前に発生" |

Trigger が Reasoning の冒頭と同一なら、finding は抽象すぎる — verifier が再現可能な観察条件として Trigger を書き直すこと。

### 報告基準

以下すべてを満たすときのみ finding を報告する。それ以外は報告しない。

- Reviewer が投機的言語（"might", "could", "possibly"）なしで問題を記述できる
- 具体的な Trigger と Reasoning を両方書ける（言語制約セクション参照）
- Reviewer が対象ファイルを読み、現在のコードに条件が存在することを確認済み

security-reviewer は基準を緩める: 悪用可能性が不確実でも、具体的な fix suggestion を添えれば finding として含める。

### 報告前検証

Finding を報告する前に、レビュアーは以下を必ず実施する。

1. 報告対象の場所（± 20 行のコンテキスト）でファイルを読む
2. 問題が実際のコードに存在することを確認する（記憶や推測ではない）
3. ファイル読み取りなしの finding は無効 — leader が破棄する

### 言語制約

Evidence、Trigger、Reasoning フィールドは具体的な言語を使用すること。

| 禁止                   | 置き換え                  |
| ---------------------- | ------------------------- |
| might, could, possibly | does, causes, results in  |
| potentially            | when [条件], [結果]       |
| may cause              | causes [X] when [Y]       |
| theoretically          | (削除 — 実際のパスを記述) |
| in some cases          | when [具体的な条件]       |

## Calibration フィルタ

順に適用する。いずれかで除外される場合、報告しない。

| フィルタ         | 質問                                                           | 除外条件                                         |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| シニアエンジニア | シニアエンジニアが変更を求めるか？                             | 「好みによる」「PR をブロックしない」            |
| 実害             | バグ/データ損失/セキュリティ/メンテナンス負荷の具体的トリガー? | 特定できない                                     |
| 修正の釣り合い   | 修正コストはリスクに見合うか？                                 | 低 severity の問題に大規模リファクタリングが必要 |

### コンテキストテスト

| コンテキスト | アクション                                                   |
| ------------ | ------------------------------------------------------------ |
| コールドパス | severity >= high でない限り除外                              |
| 意図的       | コメント、エラーメッセージ、命名が意図を示す → 除外          |
| FW イディオム | フレームワーク/ライブラリの慣習に従っている → 除外          |
| 間接カバー   | 呼び出し元やインテグレーションテストでテスト済み → 除外 (TC) |
| 意味的差異   | 構造は類似だがビジネスロジックが異なる → 除外 (DRY)          |

各レビュアーの Calibration セクションにドメイン固有の REPORT/SKIP 例がある。迷ったら SKIP を選ぶ — false negative は challenger が拾うが、false positive はパイプライン全体のコストを増やす。

## 概要テーブル

複数の finding がある場合、先頭に次のサマリーテーブルを付ける。

| ID  | Severity | Category | Location |
| --- | -------- | -------- | -------- |

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
| chaos-engineer         | blast_radius, failure, hypothesis                    | 必須      | blast_radius で severity を置換; failure+hypothesis → reasoning   |
| duplication-reviewer   | multi_location_evidence                              | 必須      | evidence に全出現箇所を列挙                                       |
| reuse-reviewer         | existing_code                                        | 必須      | evidence に新規コードと既存代替をペアで記載                       |
| efficiency-reviewer    | path_frequency                                       | 任意      | hot/warm/cold → reasoning のメモとして追記                        |
| type-safety-reviewer   | type_coverage, strict_flags                          | 任意      | サマリーレベルのメトリクスのみ                                    |

## ID プレフィックス一覧

| プレフィックス | レビュアー                                 |
| -------------- | ------------------------------------------ |
| SEC            | security-reviewer                          |
| SF             | silent-failure-reviewer                    |
| TS             | type-safety-reviewer                       |
| TD             | type-design-reviewer                       |
| CQ             | code-quality-reviewer                      |
| PE             | progressive-enhancer                       |
| RC             | root-cause-reviewer / integrator synthesis |
| DP             | design-pattern-reviewer                    |
| TEST           | testability-reviewer                       |
| TC             | test-coverage-reviewer                     |
| PERF           | performance-reviewer                       |
| A11Y           | accessibility-reviewer                     |
| DRY            | duplication-reviewer                       |
| REUSE          | reuse-reviewer                             |
| EFF            | efficiency-reviewer                        |
| DOC            | document-reviewer                          |
| OPS            | operational-readiness-reviewer             |
| PQ             | prompt-reviewer                            |
| CHX            | chaos-engineer                             |
| PF             | pre-flight (エージェントファイルではない)  |

## 統合ルール

同一パターンが複数箇所に出現する場合、次のルールを適用する。

- 単一の finding として報告
- evidence にすべての箇所を記載（最大 5 件、超過分は「他 N 件」）
- severity は全出現箇所の中でもっとも高いものを設定

例:「7 ファイルで未使用 import」→ 1 件の finding、severity は最悪ケースから

## デフォルトのエラーハンドリング

以下はすべてのレビュアーに適用される（個別定義で上書き可能）。

| エラー     | アクション                                       |
| ---------- | ------------------------------------------------ |
| Glob 空    | 「0 ファイル検出」と報告、clean と推論しない     |
| Tool error | エラーをログ、ファイルをスキップ、summary にメモ |

ドメイン固有のガード（入力欠落、依存ツール不在など）は各レビュアーの `## エラーハンドリング` セクションで扱う。
