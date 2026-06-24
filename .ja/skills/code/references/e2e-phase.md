# E2E フェーズ

/code Step 8。条件をすべて満たしたときのみ、`generator-e2e` で Spec の e2e シナリオから Playwright テストを生成する。

## 条件

すべて通過する必要があり、順に評価し、最初の失敗でスキップ。

| #   | チェック                         | 方法                                      | 失敗時              |
| --- | -------------------------------- | ----------------------------------------- | ------------------- |
| 1   | Spec に `Type: e2e` シナリオ     | Spec Test Scenarios 表を検索              | スキップ (告知なし) |
| 2   | agent-browser インストール済み   | `which agent-browser`                     | スキップ + advisory |
| 3   | package.json で dev server 検出  | `dev`, `start:dev`, `start` script に一致 | スキップ + advisory |
| 4   | dev server 稼働中 (ユーザー確認) | AskUserQuestion: "Dev server at {url}?"   | スキップ + advisory |

## Dev Server 検出

`package.json` script から検出。script 値で指定されていれば port を抽出 (`--port`, `-p`, `PORT=`)。

| 優先度 | script 名パターン | デフォルト URL        |
| ------ | ----------------- | --------------------- |
| 1      | dev, start:dev    | http://localhost:5173 |
| 2      | start             | http://localhost:3000 |

## 実行

```text
Agent(subagent_type: "generator-e2e",
      prompt: "spec_path: <path>\ndev_server_url: <url>",
      run_in_background: true)
```
