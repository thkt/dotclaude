---
name: watch
description: Discord自動応答ループを開始。watch, discord watch, auto-response で起動。
allowed-tools: CronCreate, CronDelete, CronList, mcp__plugin_discord_discord__fetch_messages, mcp__plugin_discord_discord__reply, mcp__plugin_discord_discord__react, mcp__plugin_discord_discord__edit_message
model: sonnet
argument-hint: "[interval] [channel_id]"
user-invocable: true
---

# /watch - Discord自動応答ループ

Discord DMチャンネルを監視し、新着メッセージに自動応答する `/loop` を起動する。

## 入力

- `$1`: 間隔（任意、デフォルト: `1m`）。`Ns`, `Nm`, `Nh` 形式に対応。
- `$2`: channel_id（任意）。省略時は `~/.claude/channels/discord/access.json` の `allowFrom` と `~/.claude/channels/discord/approved/` から全承認済みチャンネルを取得。

## 実行

1. `$ARGUMENTS` から間隔をパース（デフォルト `1m`）。
2. channel_id未指定の場合、`~/.claude/channels/discord/access.json` を読み、`~/.claude/channels/discord/approved/` ディレクトリからアクティブなDMチャンネルを取得（ファイル内容 = chatId）。
3. 間隔をcron式に変換:
   - `1m` → `*/1 * * * *`
   - `5m` → `*/5 * * * *`
   - `Nm`（N <= 59）→ `*/N * * * *`
   - `Nh` → `0 */N * * *`
4. CronCreateを呼び出す:
   - `cron`: 上記の式
   - `prompt`: 監視プロンプト（下記）
   - `recurring`: true
5. 確認表示: ジョブID、間隔、監視チャンネル、7日間自動失効、CronDeleteで停止可能。
6. 監視プロンプトを即座に1回実行する。

## 監視プロンプトテンプレート

チャンネルごとに:

```
Discord チャンネル {channel_id} の新着メッセージを fetch_messages で確認して、自分(me)以外の新しいメッセージがあったら、内容に応じて適切に返信して。返信済みのメッセージには再返信しないで。新着なければ何もせず待機して
```

## 停止

ユーザーが "stop" と言った場合:

1. CronListでwatchジョブを検索。
2. CronDeleteでジョブIDを指定して削除。
3. 停止を確認。
