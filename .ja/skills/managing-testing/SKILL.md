---
name: managing-testing
description: >
  テストワークフローパターン：E2Eテスト生成、テストオーケストレーション。
  トリガー: testing, E2E, end-to-end, playwright, test runner, test orchestration.
allowed-tools: [Read, Write, Glob, Task, Bash]
user-invocable: false
---

# テストワークフロー管理

自動テスト実行とE2Eテスト生成のためのテストワークフローパターン。

## ワークフローリファレンス

| ワークフロー | リファレンス                    | コマンド |
| ------------ | ------------------------------- | -------- |
| E2Eテスト    | [@./references/e2e-workflow.md] | /e2e     |

**注**: 自動テストイテレーションには `/ralph-loop`（公式プラグイン）を使用。

## テスト発見優先順位

1. `README.md`を読む → Scriptsセクション
2. `package.json`をチェック → scripts
3. テストファイルを検索（`*.test.*`, `*.spec.*`）
4. 見つからない場合はユーザーに質問

## 一般的なテストコマンド

| パッケージマネージャ | コマンド     |
| -------------------- | ------------ |
| npm                  | `npm test`   |
| yarn                 | `yarn test`  |
| pnpm                 | `pnpm test`  |
| vitest               | `npx vitest` |
| jest                 | `npx jest`   |

## E2Eテストフロー

```text
1. ブラウザ自動化（claude-in-chrome）
2. ユーザー操作を記録
3. Playwrightテストコードを生成
4. テストシナリオをドキュメント化
```

## E2E用ブラウザツール

| ツール        | 目的               |
| ------------- | ------------------ |
| `navigate`    | URLに移動          |
| `click`       | 要素をクリック     |
| `form_input`  | フォーム入力       |
| `read_page`   | ページ内容を読む   |
| `screenshot`  | スクリーンショット |
| `gif_creator` | 操作を記録         |
