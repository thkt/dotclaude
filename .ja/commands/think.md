---
description: 包括的な計画のためにSOWとSpec生成をオーケストレーション
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: inherit
argument-hint: "[タスク説明] (リサーチコンテキストがあればオプション)"
dependencies: [sow-spec-reviewer]
---

# /think - 計画オーケストレーター

## 目的

自動化された設計探索に続いてSOWとSpec生成を行う実装計画をオーケストレーション。

## テンプレート参照

**構造とフォーマットのガイダンス**に使用:

- SOW構造: [@~/.claude/templates/sow/workflow-improvement.md](~/.claude/templates/sow/workflow-improvement.md)
- Spec構造: [@~/.claude/templates/spec/workflow-improvement.md](~/.claude/templates/spec/workflow-improvement.md)
- サマリー構造: [@~/.claude/templates/summary/review-summary.md](~/.claude/templates/summary/review-summary.md)

## 入力解決

/sowと同じ - 詳細は/sow.mdを参照:

1. **明示的な引数**: 直接使用
2. **リサーチコンテキスト**: 自動検出してトピック/発見を使用
3. **どちらもなし**: タスク説明をユーザーに質問

## 実行フロー

### ステップ0: 要件明確化（条件付き）

**スキップ条件**: リサーチコンテキストが存在、詳細な説明が提供、またはフォローアップタスク。

**質問するタイミング**: 曖昧な説明、成功基準が不明、制約が不明。

#### 質問（カテゴリから5-7個）

| カテゴリ | 質問の焦点 |
| --- | --- |
| 目的 | 主な目標、解決する問題、誰が恩恵を受けるか |
| ユーザー | 主要ユーザー（エンドユーザー/内部/API） |
| 優先度 | MoSCoW（Must/Should/Could/Won't） |
| 成功 | 「完了」の定義、メトリクス |
| 制約 | 締め切り、依存関係、制限 |
| スコープ | 明示的に除外されるもの |
| エッジケース | 処理すべき特殊シナリオ |

#### 既知情報フィルター

質問前に、ユーザー入力から既知情報を抽出し、回答済みの質問をスキップ:

```text
入力: "次のスプリントまでにAPIコンシューマ向けにOAuth認証を追加"

既知: 目的 ✓、ユーザー ✓、制約 ✓
質問: 優先度、成功基準、スコープ、エッジケース
```

Q&Aを保存: `.claude/workspace/qa/[timestamp]-[topic].md`

### ステップ1: 実装設計探索

アーキテクチャ分析のためにOpusでPlanエージェント:

```typescript
Task({
  subagent_type: "Plan",
  model: "opus",
  description: "SOW/Spec整合の実装分析",
  prompt: `
機能: "${featureDescription}"
${qaResults ? `Q&A結果:\n${qaResults}\n` : ''}

信頼度マーカー [✓]/[→]/[?] 付きで収集:

1. **現状**: 定量的ベースライン（ファイル数、行数、パターン）
2. **問題**: 信頼度レベルで分類
3. **ソリューション設計**: 表形式で3つの代替案、推奨
4. **スコープ**: 変更ファイル（2-5）、依存関係、フェーズ計画
5. **受け入れ基準**: 検証付きの測定可能な基準
6. **リスク**: 確認済み/潜在的/不明で分類

出力形式: 各項目に証拠を含む表形式。
  `
})
```

**Opusを使う理由**: 深いアーキテクチャ分析と包括的なトレードオフ評価。

### ステップ2: 分析結果を表示

構造化された分析を表示（ノンブロッキング）、その後自動続行:

```text
🎯 実装分析

## 現状 | 問題サマリー | 推奨アプローチ
## 実装スコープ | 主要リスク

SOW生成に進みます...
```

データはSOWセクションに直接マップ。

### ステップ3-5: ドキュメント生成

```typescript
// ステップ3: SOW
SlashCommand({ command: '/sow "[タスク説明]"' })

// ステップ4: Spec
SlashCommand({ command: '/spec' })

// ステップ5: レビュー（オプション）
Task({ subagent_type: "sow-spec-reviewer", model: "haiku" })
```

### ステップ6: サマリー生成

Golden Master構造に従って簡潔なレビューサマリーを作成:

```markdown
# サマリー: [機能名]

## 🎯 目的 | 📋 変更概要 | 📁 スコープ
## ❓ 議論ポイント | ⚠️ リスク | ✅ 主要受け入れ基準
## 🔗 SOW/Specへのリンク
```

出力: `.claude/workspace/planning/[same-dir]/summary.md`

## 出力

すべてのドキュメントを保存: `.claude/workspace/planning/[timestamp]-[feature]/`

```text
├── sow.md     # 作業範囲記述書
├── spec.md    # 仕様書
└── summary.md # レビューサマリー ← ここから始める
```

## 使用タイミング

| 状況 | コマンド |
| --- | --- |
| 完全な計画（リサーチ後） | `/research` → `/think` |
| 完全な計画（明示的） | `/think "タスク説明"` |
| SOWのみ | `/sow` |
| Specのみ（SOWが存在） | `/spec` |
| 既存の計画を表示 | `/plans` |

## 例

```bash
# /research後（推奨）
/research "ユーザー認証オプション"
/think  # リサーチコンテキストを自動検出

# 明示的な引数付き
/think "OAuthでユーザー認証を追加"
```

## 関連コマンド

- `/sow` - SOW生成のみ
- `/spec` - Spec生成のみ
- `/plans` - 計画ドキュメントを表示
- `/code` - specに基づいて実装
