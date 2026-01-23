---
description: 実装なしでプロジェクトリサーチと技術調査を実行
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
context: fork
argument-hint: "[リサーチトピックまたは質問]"
---

# /research - プロジェクトリサーチ＆調査

信頼度ベースの発見でコードベースを調査、実装なし。

## 入力

- 引数: リサーチトピックまたは質問（必須）
- 未指定時: AskUserQuestionで確認

## 実行

| フェーズ | エージェント                                   | フォーカス                               |
| -------- | ---------------------------------------------- | ---------------------------------------- |
| 0        | （codemap確認）                                | `.codemaps/architecture.md` があれば読む |
| 1        | （目的確認）                                   | 調査意図 → `/think` 計画？               |
| 2        | `architecture-analyzer` ∥ `code-flow-analyzer` | 構造 + 実行フロー（並列）                |
| 3        | Task(Explore)                                  | 詳細: コードパス、パターン、エッジケース |
| 4        | （統合）                                       | ✓/→/?マーカー付きで整理                  |

Note: `Task(subagent_type: Explore)` で呼び出し。

### フェーズ1: 意図確認

AskUserQuestionで質問:

| 質問       | 選択肢                         |
| ---------- | ------------------------------ |
| 調査意図   | 機能計画 / バグ調査 / 理解のみ |
| 計画必要？ | Yes → 調査後 `/think` を提案   |

### フェーズ2: 並列分析

Taskで `architecture-analyzer` と `code-flow-analyzer` を並列実行。

マーカー: [@../../rules/core/AI_OPERATION_PRINCIPLES.md](../../rules/core/AI_OPERATION_PRINCIPLES.md)

## 出力

ファイル: `$HOME/.claude/workspace/research/YYYY-MM-DD-[topic].md`
テンプレート: [@../../templates/research/template.md](../../templates/research/template.md)

## 次のステップ

出力の最後に必ず含める:

| 意図     | 推奨次アクション |
| -------- | ---------------- |
| 機能計画 | `/think`         |
| バグ修正 | `/fix`           |
| 理解のみ | 完了             |
