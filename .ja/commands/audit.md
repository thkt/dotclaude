---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
dependencies: [audit-orchestrator, orchestrating-workflows]
---

# /audit - コードレビューオーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。

## 実行

```typescript
Task({
  subagent_type: "audit-orchestrator",
  description: "Comprehensive code review",
  prompt: `...`,
});
```

## レビューエージェント (15種)

### コア (8)

| エージェント              | フォーカス              |
| ------------------------- | ----------------------- |
| `structure-reviewer`      | DRY、結合度             |
| `readability-reviewer`    | 明確さ、命名            |
| `type-safety-reviewer`    | TypeScriptカバレッジ    |
| `silent-failure-reviewer` | 空のcatch、Promise      |
| `design-pattern-reviewer` | パターン一貫性          |
| `progressive-enhancer`    | CSS-firstソリューション |
| `testability-reviewer`    | テスト設計、カバレッジ  |
| `root-cause-reviewer`     | 根本原因分析            |

### pr-review-toolkit (4)

| エージェント            | フォーカス         |
| ----------------------- | ------------------ |
| `silent-failure-hunter` | エラーハンドリング |
| `comment-analyzer`      | ドキュメント品質   |
| `type-design-analyzer`  | 型の不変条件       |
| `code-simplifier`       | 簡素化             |

### 本番用 (3)

| エージェント             | フォーカス     |
| ------------------------ | -------------- |
| `security-reviewer`      | OWASP          |
| `performance-reviewer`   | バンドル、描画 |
| `accessibility-reviewer` | WCAG、ARIA     |

## 信頼度マーカー

- [✓] ≥95% - コード証拠で検証済み
- [→] 70-94% - 推論付きで推定
- [?] <70% - 含まれない

## 出力形式

```text
レビューサマリー
- ファイル: [件数] | Critical [X] / High [X] / Medium [X]

## 重大な問題
[file:line付き問題]

## 中程度の優先度
[推論付き問題]

推奨アクション
1. 即時 [✓]
2. 次のスプリント [→]
```

## IDR更新

レビュー後、以下を含む`/audit`セクションをIDRに追記:

- レビューサマリー
- 問題とアクション
- 適用した推奨事項

## 使用方法

```bash
/audit                    # フルレビュー
/audit "src/components"   # 対象スコープ
```

## 次のステップ

- **Critical** → `/fix`
- **リファクタリング** → `/think` → `/code`
