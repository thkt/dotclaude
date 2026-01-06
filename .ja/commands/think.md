---
description: 包括的な計画のためにSOWとSpec生成をオーケストレーション
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: opus
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

| カテゴリ     | 質問の焦点                                 |
| ------------ | ------------------------------------------ |
| 目的         | 主な目標、解決する問題、誰が恩恵を受けるか |
| ユーザー     | 主要ユーザー（エンドユーザー/内部/API）    |
| 優先度       | MoSCoW（Must/Should/Could/Won't）          |
| 成功         | 「完了」の定義、メトリクス                 |
| 制約         | 締め切り、依存関係、制限                   |
| スコープ     | 明示的に除外されるもの                     |
| エッジケース | 処理すべき特殊シナリオ                     |

#### 既知情報フィルター

質問前に、ユーザー入力から既知情報を抽出し、回答済みの質問をスキップ:

```text
入力: "次のスプリントまでにAPIコンシューマ向けにOAuth認証を追加"

既知: 目的 ✓、ユーザー ✓、制約 ✓
質問: 優先度、成功基準、スコープ、エッジケース
```

Q&Aを保存: `.claude/workspace/qa/[timestamp]-[topic].md`

### ステップ1: 実装設計探索

#### ステップ1a: Planエージェント（Opus）で推奨アプローチ

まず、深い分析で推奨アプローチを取得:

```typescript
Task({
  subagent_type: "Plan",
  model: "opus",
  description: "SOW/Spec整合の実装分析",
  prompt: `
機能: "${featureDescription}"
${qaResults ? `Q&A結果:\n${qaResults}\n` : ""}

信頼度マーカー [✓]/[→]/[?] 付きで収集:

1. **現状**: 定量的ベースライン（ファイル数、行数、パターン）
2. **問題**: 信頼度レベルで分類
3. **ソリューション設計**: 推奨アプローチと根拠
4. **スコープ**: 変更ファイル（2-5）、依存関係、フェーズ計画
5. **受け入れ基準**: 検証付きの測定可能な基準
6. **リスク**: 確認済み/潜在的/不明で分類

出力形式: 各項目に証拠を含む表形式。
  `,
});
```

**Opusを使う理由**: 深いアーキテクチャ分析と包括的なトレードオフ評価。

#### ステップ1b: code-architectエージェントで代替案

次に、3個のcode-architectエージェントを並列起動して比較:

```typescript
// エージェント1: 最小変更アプローチ
Task({
  subagent_type: "feature-dev:code-architect",
  description: "最小変更アプローチ",
  prompt: `
機能: "${featureDescription}"
${qaResults ? `Q&A結果:\n${qaResults}\n` : ""}

最小変更フォーカスで設計:
- 最小の変更、最大の再利用
- 可能な限り既存コンポーネントを拡張
- 最小限のリファクタリング

出力: file:line参照付きの完全な設計図
  `,
});

// エージェント2: クリーンアーキテクチャアプローチ
Task({
  subagent_type: "feature-dev:code-architect",
  description: "クリーンアーキテクチャアプローチ",
  prompt: `
機能: "${featureDescription}"
${qaResults ? `Q&A結果:\n${qaResults}\n` : ""}

クリーンアーキテクチャフォーカスで設計:
- 新しい抽象化とインターフェース
- 関心の明確な分離
- テスト可能で保守しやすい構造

出力: file:line参照付きの完全な設計図
  `,
});

// エージェント3: プラグマティックバランスアプローチ
Task({
  subagent_type: "feature-dev:code-architect",
  description: "プラグマティックバランスアプローチ",
  prompt: `
機能: "${featureDescription}"
${qaResults ? `Q&A結果:\n${qaResults}\n` : ""}

プラグマティックバランスフォーカスで設計:
- スピード + 品質のバランス
- 過度なエンジニアリングなしの良い境界
- 既存アーキテクチャに適合

出力: file:line参照付きの完全な設計図
  `,
});
```

### エージェント完了後

1. **Planの推奨をレビュー** - Opus駆動の深い分析
2. **代替案と比較** - code-architectアプローチ
3. **比較を提示** - Plan推奨をハイライトしたトレードオフ表を表示
4. **ユーザーに質問** - どのアプローチで進めるか

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
SlashCommand({ command: '/sow "[タスク説明]"' });

// ステップ4: Spec
SlashCommand({ command: "/spec" });

// ステップ5: レビュー（オプション）
Task({ subagent_type: "sow-spec-reviewer", model: "haiku" });
```

### ステップ4a: IDR要件判断

Spec生成時に、以下の基準でIDR要件を判断:

```markdown
## IDR判断ロジック

以下の条件をチェック:

1. **SOWが存在する？** → はい = IDR必須（追跡性のため）
2. **変更ファイル ≥ 3？** → はい = IDR必須（複雑性のため）
3. **アーキテクチャ決定がある？** → はい = IDR必須（文書化のため）
4. **新しいパターンを導入？** → はい = IDR必須（知識移転のため）

上記のいずれにも該当しない → IDRをスキップ可能

spec.md セクション11に出力:
| idr_required | true/false | [具体的な理由] |
```

この判断は `/code`、`/audit`、`/polish`、`/validate` で使用されます。

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

| 状況                     | コマンド               |
| ------------------------ | ---------------------- |
| 完全な計画（リサーチ後） | `/research` → `/think` |
| 完全な計画（明示的）     | `/think "タスク説明"`  |
| SOWのみ                  | `/sow`                 |
| Specのみ（SOWが存在）    | `/spec`                |
| 既存の計画を表示         | `/plans`               |

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
