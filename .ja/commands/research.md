---
description: 実装なしでプロジェクトリサーチと技術調査を実行
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
model: opus
context: fork
argument-hint: "[リサーチトピックまたは質問]"
dependencies: [Explore]
---

# /research - プロジェクトリサーチ＆調査

信頼度ベースの発見でコードベースを調査、実装なし。

## 入力

- 引数: リサーチトピックまたは質問（必須）
- 未指定時: AskUserQuestionで確認

## 実行

1. スコープ発見（プロジェクト構造、技術スタック）
2. `Explore`と`code-explorer`エージェントによる調査
3. 信頼度マーカー（✓/→/?）で統合

## 出力

```text
.claude/workspace/research/
├── YYYY-MM-DD-[topic].md          # 詳細な発見
└── YYYY-MM-DD-[topic]-context.md  # /think統合用
```

### 必須セクション

1. 目的
2. 前提条件（✓/→/?）
3. 利用可能なデータ
4. 制約
5. 主要な発見
6. 参照
