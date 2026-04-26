---
name: use-cli-recall
description: recall CLI経由で過去のClaude Code/Codexセッション検索。Use when: 前に, あの時, また同じ, あの件, past decisions, recurring mistake, module first contact, BACKLOG task pickup, temporal reference, structural echo, vague back-reference.
allowed-tools: [Bash, Read]
user-invocable: false
---

# use-cli-recall

## トリガー（迷わず呼ぶ）

| トリガー           | シグナル                                        |
| ------------------ | ----------------------------------------------- |
| 時間参照           | 「前に」「あの時」過去のイベント・判断          |
| 構造的類似         | 今の問題が過去の状況を反復                      |
| 反復               | 「また同じ」繰り返すミス                        |
| 曖昧な後方参照     | 「あの件」詳細のない過去作業                    |
| モジュール初接触   | このセッションで未触のファイル/モジュール編集   |
| BACKLOG タスク着手 | BACKLOG.md からタスクを開始                     |

## コマンド

| 目的                 | コマンド                                               |
| -------------------- | ------------------------------------------------------ |
| 検索                 | `recall "query"`                                       |
| 直近 N 日            | `recall "query" --days N`                              |
| プロジェクトフィルタ | `recall "query" --project <path>`                      |
| ソースフィルタ       | `recall "query" --source claude` or `--source codex`   |
| 再インデックス       | `recall --reindex`                                     |

## use-cli-yomu との並列

過去の判断（use-cli-recall）vs 現在のコード状態（use-cli-yomu）。以下のトリガーで両方を並列実行。

| トリガー           | recall クエリ          | yomu クエリ            |
| ------------------ | ---------------------- | ---------------------- |
| モジュール初接触   | モジュール名・設計経緯 | モジュール名・関連概念 |
| BACKLOG 着手       | タスク名・関連決定     | タスク関連コード       |
| 構造的類似         | 過去の類似問題         | 現在の類似コード       |
