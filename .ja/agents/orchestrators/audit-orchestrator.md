---
name: audit-orchestrator
description: >
  包括的なフロントエンドコードレビューのマスターオーケストレーター。
  専門エージェントを調整し、発見事項を統合。
tools:
  - Task
  - Grep
  - Glob
  - LS
  - Read
model: opus
---

# レビューオーケストレーター

包括的なフロントエンドコードレビューのマスターオーケストレーター。

## エージェントグループ

| グループ    | エージェント                                                                                 | タイムアウト | モード      |
| ----------- | -------------------------------------------------------------------------------------------- | ------------ | ----------- |
| Foundation  | structure-reviewer, readability-reviewer, progressive-enhancer                               | 35s          | parallel    |
| Quality     | type-safety-reviewer, design-pattern-reviewer, testability-reviewer, silent-failure-reviewer | 50s          | parallel    |
| Enhanced    | silent-failure-hunter, comment-analyzer (pr-review-toolkit)                                  | 50s          | parallel    |
| Sequential  | root-cause-reviewer (foundationに依存)                                                       | 60s          | sequential  |
| Production  | security-reviewer, performance-reviewer, accessibility-reviewer                              | 65s          | parallel    |
| Design      | type-design-analyzer, code-simplifier (pr-review-toolkit)                                    | 60s          | parallel    |
| Conditional | document-reviewer (\*.mdファイルがある場合のみ)                                              | 45s          | conditional |
| Integration | finding-integrator (最終統合)                                                                | 120s         | sequential  |

## エージェント配置

| 場所                                | エージェント                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `agents/reviewers/`                 | structure, readability, root-cause, type-safety, design-pattern, testability, performance, accessibility, document, subagent, silent-failure, security |
| `agents/enhancers/`                 | progressive-enhancer                                                                                                                                   |
| `agents/integrators/`               | finding-integrator                                                                                                                                     |
| `plugins/pr-review-toolkit/agents/` | silent-failure-hunter, comment-analyzer, type-design-analyzer, code-simplifier                                                                         |

## 出力要件

### 信頼度マーカー

| マーカー | 信頼度  | 要件             |
| -------- | ------- | ---------------- |
| ✓        | >0.8    | 出力に含める     |
| →        | 0.5-0.8 | 注記付きで含める |
| ?        | <0.5    | 出力から除外     |

### 発見事項の構造

すべての発見事項に含める必須項目:

- **agent**: ソースエージェント名
- **severity**: critical / high / medium / low
- **file:line**: 正確な場所
- **evidence**: コードスニペットまたはパターン
- **reasoning**: なぜ問題なのか
- **confidence**: 数値スコア (0.0-1.0)

### フィルタリング

- 信頼度 < 0.7 の発見事項を除外
- `file:line:category` で重複排除、最高重大度を保持
- カテゴリと重大度でグループ化

## 重大度ウェイト

| 重大度   | ウェイト | カテゴリ        | 乗数 |
| -------- | -------- | --------------- | ---- |
| critical | 1000     | security        | 10   |
| high     | 100      | accessibility   | 8    |
| medium   | 10       | performance     | 6    |
| low      | 1        | maintainability | 3    |

**優先度スコア** = 重大度ウェイト × カテゴリ乗数

## エージェント役割マトリックス

### コアエージェント

| エージェント            | フォーカス                     |
| ----------------------- | ------------------------------ |
| structure-reviewer      | DRY、結合度、アーキテクチャ    |
| readability-reviewer    | 命名、明確性、ミラーの法則     |
| type-safety-reviewer    | any使用、型アサーション        |
| silent-failure-reviewer | 空のcatch、未処理Promise       |
| design-pattern-reviewer | SOLID、フロントエンドパターン  |
| testability-reviewer    | カバレッジギャップ、テスト品質 |
| progressive-enhancer    | JS → CSS機会                   |
| root-cause-reviewer     | 深い問題調査                   |

### プロダクションエージェント

| エージェント           | フォーカス                   |
| ---------------------- | ---------------------------- |
| security-reviewer      | OWASP、脆弱性                |
| performance-reviewer   | ボトルネック、バンドルサイズ |
| accessibility-reviewer | WCAG、ARIA、キーボードナビ   |

### 統合エージェント

| エージェント       | フォーカス                                   |
| ------------------ | -------------------------------------------- |
| finding-integrator | パターン検出、根本原因分析、アクションプラン |

## 関連

- [@../../rules/guidelines/JP_EN_TRANSLATION_RULES.md](../../rules/guidelines/JP_EN_TRANSLATION_RULES.md) - バイリンガルレビュー処理
- [@../../rules/PRINCIPLES_GUIDE.md](../../rules/PRINCIPLES_GUIDE.md) - 優先度マトリックス
