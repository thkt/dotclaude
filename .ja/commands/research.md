---
description: 実装なしでプロジェクトリサーチと技術調査を実行
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
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

| フェーズ | エージェント            | フォーカス                               |
| -------- | ----------------------- | ---------------------------------------- |
| 1        | `architecture-analyzer` | 全体像: 構造、技術スタック               |
| 2        | `Explore`               | 詳細: コードパス、パターン、エッジケース |
| 3        | （統合）                | ✓/→/?マーカー付きで整理                  |

マーカー: [@../../rules/core/AI_OPERATION_PRINCIPLES.md](../../rules/core/AI_OPERATION_PRINCIPLES.md)

## 出力

ファイル: `$HOME/.claude/workspace/research/YYYY-MM-DD-[topic].md`
テンプレート: [@../../templates/research/template.md](../../templates/research/template.md)
