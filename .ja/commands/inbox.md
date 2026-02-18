---
description: GitHub、Slack、Google Calendar を横断してインボックスを確認。inbox, タスク確認, 自分のissue, my tasks, 関連タスク, 未読確認, 今日のタスク に言及した場合に使用。
allowed-tools: Bash(gh:*), Bash(curl:*), Bash(jq:*), Bash(date:*), Bash(gemini:*), Bash(which:*), Read
model: sonnet
argument-hint: "[github|slack|calendar|all] [--days N]"
---

# /inbox - タスク集約

## 入力

- ソースフィルタ: `$1`（任意: `github`, `slack`, `calendar`, `all`。デフォルト: `all`）
- 期間: `$ARGUMENTS` から `--days N` をパース → `DAYS` 変数に設定（デフォルト: 7）

## 実行

全ソースのクエリを並列実行。

### GitHub

全コマンドで `--json repository,title,number,updatedAt,url` を使用:

| 優先度 | クエリ            | フィルタ                                                                                              |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| 1      | レビュー依頼      | `gh search prs --review-requested @me --state open --limit 15`                                        |
| 2      | アサイン済みIssue | `gh search issues --assignee @me --state open --limit 15`                                             |
| 3      | 自分のPR          | `gh search prs --author @me --state open --limit 15`                                                  |
| 4      | 最近のメンション  | `gh search issues --mentions @me --state open --updated ">=$(date -v-${DAYS}d +%Y-%m-%d)" --limit 10` |

重複排除: 複数カテゴリに該当 → 最高優先度のみ表示。

### Slack

必須: `$SLACK_TOKEN` (xoxp-...) と `$SLACK_WORKSPACE` 環境変数。詳細は skill `accessing-slack` を参照。

1. `$SLACK_TOKEN` が設定されているか確認 — 未設定ならセットアップヒント付きでスキップ
2. 検索: `curl -s -G -H "Authorization: Bearer $SLACK_TOKEN" --data-urlencode "query=to:me after:$(date -v-${DAYS}d +%Y-%m-%d)" -d "count=10" -d "sort=timestamp" "https://slack.com/api/search.messages"`
3. `jq` でパース: `.messages.matches[]` を抽出 → `{channel: .channel.name, user: .username, text, ts, permalink}`

リンク: API レスポンスの `permalink` を使用。

### Google Calendar

1. `which gemini` — 未インストールの場合はセットアップヒント付きでスキップ
2. `gemini -p "List my Google Calendar events from $(date +%Y-%m-%d) to $(date -v+${DAYS}d +%Y-%m-%d). Output as TSV: date, time, title. No explanation." -y -e google-workspace`

## 出力

ヘッダー: `Inbox Summary (YYYY-MM-DD)`。フッター: 期間とソース利用可否。

ソースごとにカテゴリ別テーブルを表示: `| Repo | [#N Title](url) | Updated |`（GitHub）、`| Channel | From | Message | Time |`（Slack）、`| Time | Event | Link |`（Calendar）。

## ルール

| ルール           | 詳細                                          |
| ---------------- | --------------------------------------------- |
| タイトル         | 30文字以下、装飾プレフィックス除去            |
| リポ名           | `repo` のみ（`org/repo` ではない）            |
| 時間             | 簡潔表記: `2h`, `1d`, `02-05`（"ago" 不使用） |
| Slack メッセージ | 姓のみ、30文字以下、スレッドでグループ化      |
| 空カテゴリ       | セクション省略                                |
| 全空             | そのソースに「保留項目なし」                  |
| 利用不可         | スキップ、フッターにセットアップヒント記載    |
| `gh` 未認証      | `gh auth login` の実行を案内                  |
| 部分障害         | 完了分を表示、注記追加                        |
