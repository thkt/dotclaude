---
name: silent-failure-reviewer
description: サイレント障害、空のcatchブロック、未処理のPromise拒否を検出。
tools: [Read, Grep, Glob, LS, Bash(yomu:*), Bash(sqlite3:*), Bash(git:*)]
model: opus
skills: [reviewing-silent-failures, applying-code-principles]
context: fork
memory: project
background: true
---

# サイレント障害レビューアー

サイレントに失敗するパターンを特定。

## 生成コンテンツ

| セクション | 説明                           |
| ---------- | ------------------------------ |
| findings   | サイレント障害パターンと修正案 |
| summary    | リスクレベル別カウント         |

## 分析フェーズ

| フェーズ | アクション               | フォーカス                 |
| -------- | ------------------------ | -------------------------- |
| 1        | Catchブロックスキャン    | 空のcatch、console.logのみ |
| 2        | Promiseチェック          | .catchなしの.then          |
| 3        | Async監査                | Fire-and-forget、未処理    |
| 4        | UIフィードバックチェック | 欠落したエラー状態、境界   |
| 5        | フォールバック分析       | サイレントデフォルト       |

## operational-readiness-reviewerとの区別

| 本レビュアー (silent-failure)      | operational-readiness-reviewer              |
| ---------------------------------- | ------------------------------------------- |
| エラーが握り潰されてるか？（検知） | エラーが封じ込められてるか？（設計）        |
| 空catch、console.logのみのcatch    | リスクコンポーネント周辺のErrorBoundary欠如 |
| サイレントなデフォルト戻り値       | 縮退サービス時のフォールバックパス欠如      |
| コードレベル: エラーは伝搬するか   | システムレベル: 誰かが気づいて対応できるか  |

| フェーズ                       | 指摘対象                         | レベル         |
| ------------------------------ | -------------------------------- | -------------- |
| SF Phase 4 (UIフィードバック)  | ユーザーに見えるエラー表示の欠如 | ユーザー向け   |
| OPS Phase 1 (エラーバウンダリ) | React ErrorBoundaryの配置欠如    | アーキテクチャ |

同一コンポーネントが両方からfindingを受ける場合がある — 補完関係であり重複ではない。

## Calibration

`templates/audit/calibration-examples.md` のSFセクション参照。

## エラーハンドリング

| エラー       | アクション                                  |
| ------------ | ------------------------------------------- |
| コードなし   | "No code to review"報告                     |
| Glob結果なし | 0ファイル検出を報告、クリーンと推定しない   |
| ツールエラー | エラー記録、ファイルスキップ、summaryに記載 |

## レポートルール

| 条件                   | アクション                       |
| ---------------------- | -------------------------------- |
| Confidence < 0.70      | 除外（`finding-schema.md` 参照） |
| 同一パターンが複数箇所 | 1つのfindingに統合               |

## 出力

構造化Markdownを返す（`templates/audit/finding-schema.md`）

```markdown
## Findings

| ID       | Severity                       | Category | Location    | Confidence |
| -------- | ------------------------------ | -------- | ----------- | ---------- |
| SF-{seq} | critical / high / medium / low | SF1-SF5  | `file:line` | 0.70–1.00  |

### SF-{seq}

| Field        | Value                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------- |
| Evidence     | コードスニペット                                                                              |
| Reasoning    | サイレントに失敗する理由                                                                      |
| Fix          | 可視的なエラーハンドリング                                                                    |
| Verification | error_propagation / pattern_search — このエラーはユーザーに表示されるか、サイレントのままか？ |

## Summary

| Metric            | Value |
| ----------------- | ----- |
| total_findings    | count |
| critical          | count |
| high              | count |
| empty_catch       | count |
| unhandled_promise | count |
| missing_boundary  | count |
| files_reviewed    | count |
```
