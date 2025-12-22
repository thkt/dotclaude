---
description: SOWとSpec生成を包括的な計画としてオーケストレーション
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: inherit
argument-hint: "[タスク説明] (リサーチコンテキストがあればオプション)"
dependencies: [sow-spec-reviewer]
---

# /think - 計画オーケストレーター

## 目的

SOWとSpec生成を単一のワークフローとしてオーケストレーションします。

## Golden Master 参照

**構造とフォーマットのガイダンス**として使用:

- SOW構造: [@~/.claude/golden-masters/documents/sow/example-workflow-improvement.md](~/.claude/golden-masters/documents/sow/example-workflow-improvement.md)
- Spec構造: [@~/.claude/golden-masters/documents/spec/example-workflow-improvement.md](~/.claude/golden-masters/documents/spec/example-workflow-improvement.md)

**重要**: 構造のみを参照し、ユーザーのタスクに基づいて新しいコンテンツを生成してください。

## 入力解決

/sowと同じ - 詳細は/sow.mdを参照:

1. **明示的な引数**: 直接使用
2. **リサーチコンテキスト**: 自動検出してトピック/発見事項を使用
3. **どちらもない場合**: ユーザーにタスク説明を要求

## 実行フロー

### Step 0: 要件明確化（条件付き）

SOW生成の前に、対話的Q&Aで要件を明確化します。

**スキップ条件**（Step 1に直接進む）:

- 明確な要件を含むリサーチコンテキストが存在
- ユーザーが受け入れ基準付きの詳細な説明を提供
- 既存のSOW/Specがあるフォローアップタスク

**質問が必要な場合**（要件が不明確）:

- 曖昧なタスク説明
- 成功基準が不明
- 制約や優先度が不明

#### 質問テンプレート（ビジネス重視）

以下のカテゴリから5-7個の質問:

```markdown
📌 要件明確化

1. **目的**: この機能の主な目標は？
   - どの問題を解決する？
   - 誰が恩恵を受ける？

2. **ユーザー**: 主要なユーザーは誰？
   - エンドユーザー / 社内チーム / API利用者？

3. **優先度**: どのくらい重要？（MoSCoW）
   - Must have / Should have / Could have / Won't have

4. **成功基準**: 完了をどう判断する？
   - 「動作している」とはどういう状態？
   - 具体的な指標は？

5. **制約**: 制限事項はある？
   - 納期 / 依存関係 / 技術的制約？

6. **スコープ**: 明示的にスコープ外は？
   - やるべきでないことは？

7. **エッジケース**: 特別に処理すべきシナリオは？
   - エラー状態 / 空状態 / 境界条件？
```

#### 既知情報フィルタ（新機能）

**重要**: 質問の前に、ユーザー入力から既知情報を抽出し、すでに回答済みの質問をスキップします。

```typescript
interface KnownInfo {
  purpose?: string      // タスク説明で言及された目標
  users?: string        // 言及または推測可能なユーザータイプ
  priority?: string     // 緊急度の指標（「急ぎ」「重大」など）
  criteria?: string[]   // 言及された成功基準
  constraints?: string[] // 言及された納期、依存関係
  scope?: string        // 言及された除外事項
  edgeCases?: string[]  // 言及されたエッジケース
}

function extractKnownInfo(taskDescription: string): KnownInfo {
  // タスク説明から既に提供された情報を分析
  // 例:
  // "エンドユーザー向けにログインボタンを追加" → users: "エンドユーザー"
  // "金曜日までに重大なバグを修正" → priority: "Must have", constraints: ["金曜日の納期"]
  // "OAuth認証を追加（SSOは除く）" → scope: "SSOは除外"
}

function filterQuestions(allQuestions: Question[], known: KnownInfo): Question[] {
  return allQuestions.filter(q => {
    // すでに回答がわかっている質問をスキップ
    if (q.category === 'purpose' && known.purpose) return false
    if (q.category === 'users' && known.users) return false
    if (q.category === 'priority' && known.priority) return false
    // ... すべてのカテゴリに適用
    return true
  })
}
```

**適用例**:

```markdown
ユーザー入力: "次のスプリントまでにAPI利用者向けのOAuth認証を追加"

抽出された既知情報:
- ✓ 目的: OAuth認証（推測: 安全なAPIアクセス）
- ✓ ユーザー: API利用者
- ✓ 制約: 次のスプリントの納期

質問する項目（残りの不明点）:
1. 優先度: Must have / Should have / Could have?
2. 成功基準: 「動作する」OAuthとは何を指す？
3. スコープ: 除外するプロバイダーは？（Google/GitHub等）
4. エッジケース: トークン更新、取り消しのシナリオは？

スキップした質問（既に判明）:
- 目的: ✓ すでに記載
- ユーザー: ✓ すでに記載
- 制約: ✓ すでに記載
```

#### Q&Aフロー

```typescript
// 1. 明確化が必要か確認
const needsClarification = !hasResearchContext() && !hasDetailedDescription()

if (needsClarification) {
  // 2. タスク説明から既知情報を抽出（新機能）
  const knownInfo = extractKnownInfo(taskDescription)

  // 3. すでに回答済みの質問をフィルタリング（新機能）
  const allQuestions = getQuestionsTemplate()
  const remainingQuestions = filterQuestions(allQuestions, knownInfo)

  // 4. 既知情報のサマリー + 残りの質問を表示
  displayKnownInfoSummary(knownInfo)  // すでにわかっていることを表示
  displayQuestions(remainingQuestions) // 不明点のみ質問
  // ユーザーの回答を待機

  // 5. Q&Aを参照用に保存（抽出情報 + 回答を含む）
  const qaPath = `.claude/workspace/qa/${timestamp}-${topic}.md`
  saveQA(qaPath, knownInfo, remainingQuestions, answers)

  // 6. 理解確認を表示
  displayUnderstandingCheck()
  // ユーザーの確認を待機
}
```

#### Q&A出力フォーマット

```markdown
# Q&A: [トピック]
日付: [YYYY-MM-DD]

## 質問と回答

### 1. 目的
**Q**: 主な目標は？
**A**: [ユーザーの回答]

### 2. ユーザー
**Q**: 主要なユーザーは？
**A**: [ユーザーの回答]

[... その他のQ&A ...]

## サマリー
- **目標**: [回答から抽出]
- **優先度**: [Must/Should/Could]
- **成功基準**: [主要な基準]
- **制約**: [主要な制約]
```

保存先: `.claude/workspace/qa/[timestamp]-[topic].md`

### Step 1: SOW生成

```typescript
// 引数が提供された場合
SlashCommand({ command: '/sow "[タスク説明]"' })

// 引数なし（/sowの入力解決に依存）
SlashCommand({ command: '/sow' })
```

### Step 2: Spec生成

```typescript
SlashCommand({ command: '/spec' })
// Step 1で作成されたSOWを自動検出
```

### Step 3: レビュー（オプション）

```typescript
Task({
  subagent_type: "sow-spec-reviewer",
  model: "haiku",
  prompt: "生成されたSOWとSpecの品質と整合性をレビューしてください。"
})
```

### Step 4: サマリー生成（レビュー用サマリー）

SOWとSpecを生成した後、効率的なチームレビューのための簡潔なサマリーを作成します。

**サマリー構造**（参照: [@~/.claude/golden-masters/documents/summary/example-workflow-improvement.md](~/.claude/golden-masters/documents/summary/example-workflow-improvement.md)）:

```markdown
# Summary: [機能名] (Review Summary)

## 🎯 Purpose (1-2 sentences)
[SOW Executive Summaryから抽出]

## 📋 Change Overview
[フェーズ/ステップの簡潔な表]

## 📁 Scope of Impact
- Files to modify: [主要ファイル2-5個]
- Affected components: [影響を受けるモジュール]

## ❓ Discussion Points
[SOW/Specの[?]マーカー項目 + 代替案の選択]

## ⚠️ Risks
[高リスク項目のみ]

## ✅ Key Acceptance Criteria
[SOW受け入れ基準から主要4-5項目]

## 🔗 Detailed Documentation
- SOW: `sow.md`
- Spec: `spec.md`
```

**出力**: `.claude/workspace/planning/[same-dir]/summary.md`

## 出力

すべてのドキュメントの保存先:
`.claude/workspace/planning/[timestamp]-[feature]/`

```text
├── sow.md     # Statement of Work（詳細）
├── spec.md    # Specification（詳細）
└── summary.md # レビュー用サマリー（クイックレビュー用）
```

完了後の表示:

```text
✅ 計画完了:
   SOW:     .claude/workspace/planning/[path]/sow.md
   Spec:    .claude/workspace/planning/[path]/spec.md
   Summary: .claude/workspace/planning/[path]/summary.md ← ここからレビュー開始
```

## 使用タイミング

| 状況 | コマンド |
|------|---------|
| フル計画（リサーチ後） | `/research` → `/think` |
| フル計画（明示的） | `/think "タスク説明"` |
| SOWのみ | `/sow` または `/sow "タスク"` |
| Specのみ（SOW存在時） | `/spec` |
| 既存計画を表示 | `/plans` |

## 使用例

```bash
# /research後（推奨ワークフロー）
/research "ユーザー認証オプション"
/think  # リサーチコンテキストを自動検出

# 明示的な引数付き
/think "OAuthでユーザー認証を追加"

# コンテキストなし、引数なし → 入力を要求
/think
# → "何を計画しますか？タスク説明を入力してください。"
```

## 関連コマンド

- `/sow` - SOW生成のみ
- `/spec` - Spec生成のみ
- `/plans` - 計画ドキュメントを表示
- `/code` - specに基づいて実装
