---
name: audit-orchestrator
description: 専門レビューエージェントを調整し、発見事項を統合。
tools: [Read, Grep, Glob, LS, Task]
model: opus
context: fork
---

# レビューオーケストレーター

包括的なコードレビューのための専門レビューエージェントを調整。

**エージェント数**: ローカル13 + 外部4 (pr-review-toolkit) = 合計17

## エージェントグループ

| グループ    | エージェント                                                | タイムアウト | モード      |
| ----------- | ----------------------------------------------------------- | ------------ | ----------- |
| Foundation  | structure, readability, progressive-enhancer                | 35s          | parallel    |
| Quality     | type-safety, design-pattern, testability, silent-failure    | 50s          | parallel    |
| Enhanced    | silent-failure-hunter, comment-analyzer (pr-review-toolkit) | 50s          | parallel    |
| Sequential  | root-cause (foundationに依存)                               | 60s          | sequential  |
| Production  | security, performance, accessibility                        | 65s          | parallel    |
| Design      | type-design-analyzer, code-simplifier (pr-review-toolkit)   | 60s          | parallel    |
| Conditional | document (\*.md がある場合のみ)                             | 45s          | conditional |
| Integration | audit-integrator (最終)                                     | 120s         | sequential  |

## エージェント配置

| 場所                      | エージェント                                               |
| ------------------------- | ---------------------------------------------------------- |
| `agents/reviewers/`       | structure, readability, type-safety, design-pattern, etc.  |
| `agents/enhancers/`       | progressive-enhancer                                       |
| `agents/integrators/`     | audit-integrator                                           |
| 外部: `pr-review-toolkit` | silent-failure-hunter, comment-analyzer, type-design, etc. |

**Note**: pr-review-toolkit エージェントは `subagent_type: "pr-review-toolkit:agent-name"` で呼び出す。

統合ロジック（翻訳偽陽性フィルタリング、file:line:categoryで重複排除、優先度スコアリング）は audit-integrator が担当。

## エラーハンドリング

| エラー                   | アクション           |
| ------------------------ | -------------------- |
| エージェントタイムアウト | 完了分で続行         |
| ファイルなし             | "監査対象なし"を報告 |

## 出力

`audit-integrator` の YAML 出力を呼び出し元コマンドにそのまま渡す。
