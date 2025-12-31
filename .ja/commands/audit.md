---
description: 包括的なコード品質評価のため専門レビューエージェントをオーケストレートする
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: inherit
argument-hint: "[対象ファイルまたはスコープ]"
dependencies: [audit-orchestrator]
---

# /audit - コードレビューオーケストレーター

## 目的

信頼度ベースのフィルタリングとエビデンス要件を備えた専門レビューエージェントをオーケストレートします。

## 動的コンテキスト

### Git状態

```bash
\!`git status --porcelain 2>/dev/null || echo "(gitリポジトリではありません)"`
```

### 変更ファイル

```bash
\!`git diff --name-only HEAD 2>/dev/null | head -10`
```

### Spec参照（自動検出）

spec.mdを検索:

- `.claude/workspace/planning/**/spec.md`

**spec.mdが存在する場合**: 実装がFR-xxx要件に合致しているか検証。
**存在しない場合**: コードのみの分析でレビューを実施。

## 実行

audit-orchestratorを呼び出し:

```typescript
Task({
  subagent_type: "audit-orchestrator",
  description: "包括的コードレビュー",
  prompt: `
コードレビューを実行:

### コンテキスト
- 変更ファイル: ${gitDiff}
- 仕様: ${specContext || "なし"}

### レビュープロセス
1. コンテキスト発見: リポジトリ構造、技術スタックを分析
2. 並列レビュー: 専門エージェントを同時起動
3. フィルタ＆統合: 信頼度フィルタを適用（>0.7）

### 呼び出すエージェント

**コアエージェント**:
- structure-reviewer, readability-reviewer, progressive-enhancer
- type-safety-reviewer, design-pattern-reviewer, testability-reviewer
- silent-failure-reviewer, root-cause-reviewer

**拡張エージェント (pr-review-toolkit)**:
- silent-failure-hunter, comment-analyzer
- type-design-analyzer, code-simplifier

**本番エージェント**:
- security-reviewer, performance-reviewer, accessibility-reviewer

### 出力要件
- エビデンス必須: すべての指摘にfile:line
- 信頼度マーカー: ✓ (>0.8), → (0.5-0.8)
- 重要度でグループ化: Critical, High, Medium, Low
- 日本語でレポート
  `
})
```

## レビューエージェント（計15）

### コアエージェント（8）

| エージェント | フォーカス |
| --- | --- |
| `structure-reviewer` | コード構成、DRY、結合度 |
| `readability-reviewer` | 明確性、命名、複雑性 |
| `type-safety-reviewer` | TypeScriptカバレッジ、any使用 |
| `silent-failure-reviewer` | 空catch、未処理Promise |
| `design-pattern-reviewer` | パターン一貫性 |
| `progressive-enhancer` | CSS-firstソリューション |
| `testability-reviewer` | テスト設計、カバレッジギャップ |
| `root-cause-reviewer` | 根本原因分析 |

### 拡張エージェント - pr-review-toolkit（4）

| エージェント | フォーカス | 補完対象 |
| --- | --- | --- |
| `silent-failure-hunter` | 詳細なエラーハンドリング分析 | silent-failure-reviewer |
| `comment-analyzer` | コメント品質、ドキュメント腐敗 | (新カテゴリ) |
| `type-design-analyzer` | 型設計（不変条件、カプセル化） | type-safety-reviewer |
| `code-simplifier` | 簡素化提案 | readability-reviewer |

### 本番エージェント（3）

| エージェント | フォーカス |
| --- | --- |
| `security-reviewer` | OWASP、脆弱性 |
| `performance-reviewer` | ボトルネック、バンドルサイズ |
| `accessibility-reviewer` | WCAG、キーボードナビ、ARIA |

## 信頼度マーカー

- **[✓]** 高 (>0.8): 直接的なコードエビデンスで検証済み
- **[→]** 中 (0.5-0.8): 推論と根拠あり
- **[?]** 低 (<0.5): 出力に含めない

## 除外ルール

**自動除外**:

- スタイル/フォーマット（リンターが処理）
- テストファイル（リクエストがない限り）
- 生成/ベンダーコード
- 悪用経路のない理論的問題
- 測定可能な影響のないマイクロ最適化

## 出力形式

```text
レビュー概要
- レビュー済みファイル: [count]
- 総問題数: Critical [X] / High [X] / Medium [X]
- 全体信頼度: [✓/→] [score]

## ✓ Critical Issues 🚨 (信頼度 > 0.9)

### Issue #1: [タイトル]
- ファイル: path/to/file.ts:42
- エビデンス: [具体的なコードまたはパターン]
- 影響: [ユーザー/システムへの影響]
- 推奨: [例付きの修正案]

## ✓ High Priority ⚠️ (信頼度 > 0.8)
[issues...]

## → Medium Priority 💡 (信頼度 0.7-0.8)
[推論の根拠付きのissues...]

推奨アクション
1. 即時対応 [✓]: [critical fixes]
2. 次スプリント [→]: [high priority]
3. バックログ [→]: [improvements]
```

## 実行時間

| カテゴリ | エージェント数 |
| --- | --- |
| コア | 8 |
| pr-review-toolkit | 4 |
| 本番 | 3 |
| **合計** | **15** |

*エージェントは並列実行。通常の実行時間: 約3-5分。*

## 使用例

```bash
# フルレビュー（15エージェント）
/audit

# 対象スコープを指定
/audit "src/components"
```

## ベストプラクティス

1. **エビデンス必須**: 常にfile:lineを含める
2. **信頼度をマーク**: ✓は検証済み、→は推論
3. **高信頼度に集中**: ✓の問題を優先
4. **推論を検証**: →の指摘は修正前に確認
5. **段階的にレビュー**: 大きく稀にではなく、小さく頻繁に

## 次のステップ

レビュー後:

- **Critical/バグ** → `/fix`
- **リファクタリング** → `/think` → `/code`
- **テスト** → `/test`
