---
description: ガイド付きブラウザ操作を通じてドキュメントとPlaywrightテストを生成
allowed-tools: Read, Write, Glob, Task, mcp__claude-in-chrome__*, mcp__playwright__*
model: opus
argument-hint: "[テスト名]"
---

# /e2e - E2Eテスト生成

ブラウザ操作を通じてドキュメントとPlaywrightテストを生成。

## 入力

- 引数: テスト名（必須）
- 未指定時: AskUserQuestionで確認

## 実行

`claude-in-chrome`経由のブラウザ操作、その後Playwrightテストを生成（ワークフローはmanaging-testingで定義）。

## 出力

```text
tests/e2e/[テスト名]/
├── README.md          # ドキュメント
├── screenshots/       # ステップ画像
└── [name].spec.ts     # Playwrightテスト
```
