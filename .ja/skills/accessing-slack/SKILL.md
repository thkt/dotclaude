---
name: accessing-slack
description: >
  Slack API経由でメッセージ、スレッド、検索にアクセスする。
  SlackのURL (xxx.slack.com/archives/...) を共有した時、または
  Slack, スラック, メッセージ取得, スレッド, Slack検索 に言及した時に使用。
allowed-tools:
  - Bash
  - Read
user-invocable: false
---

# Slackアクセス

Slack API経由でメッセージ、スレッド、検索にアクセスする。

## 前提条件

| 変数              | 説明                                          |
| ----------------- | --------------------------------------------- |
| `SLACK_TOKEN`     | User OAuth Token (`xoxp-...`)                 |
| `SLACK_WORKSPACE` | ワークスペースサブドメイン (`.slack.com`の前) |

API呼び出しの前に `SLACK_TOKEN` が設定されていることを確認する。

## URL解析

| パターン                                             | 抽出方法                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `{workspace}.slack.com/archives/{CHANNEL}/p{TS_RAW}` | `CHANNEL`: `/archives/` の後、`TS`: 末尾6桁の前に `.` を挿入 |

逆変換（リンク生成）: TSから `.` を除去し、`p` を先頭に付加。

## コマンド

### メッセージ取得

```bash
curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
  "https://slack.com/api/conversations.history?channel=$CHANNEL&latest=$TS&inclusive=true&limit=1" \
  | jq 'if .ok then .messages[0].text else "Error: \(.error)" end'
```

### スレッド取得

```bash
curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
  "https://slack.com/api/conversations.replies?channel=$CHANNEL&ts=$TS" \
  | jq 'if .ok then [.messages[] | {user, text}] else "Error: \(.error)" end'
```

### メッセージ検索

```bash
curl -s -G -H "Authorization: Bearer $SLACK_TOKEN" \
  --data-urlencode "query=SEARCH_QUERY" \
  -d "count=5" \
  "https://slack.com/api/search.messages" \
  | jq 'if .ok then [.messages.matches[] | {channel: .channel.name, text, ts}] else "Error: \(.error)" end'
```

### スレッドへの返信

実行前にユーザーの確認が必要。

```bash
curl -s -X POST -H "Authorization: Bearer $SLACK_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"$CHANNEL\",\"thread_ts\":\"$TS\",\"text\":\"MESSAGE\"}" \
  "https://slack.com/api/chat.postMessage" \
  | jq 'if .ok then "Sent" else "Error: \(.error)" end'
```

## エラーハンドリング

| エラー              | 原因              | 対処                                   |
| ------------------- | ----------------- | -------------------------------------- |
| `not_in_channel`    | Bot tokenで未招待 | User Tokenを使用                       |
| `missing_scope`     | スコープ未追加    | レスポンスの `needed` フィールドを確認 |
| `channel_not_found` | チャンネルID誤り  | URL解析を確認                          |
