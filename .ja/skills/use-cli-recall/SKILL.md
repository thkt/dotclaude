---
name: use-cli-recall
description: recall CLI 経由で過去の Claude Code/Codex セッションを検索する。
when_to_use: 前に, あの時, また同じ, あの件, past decisions, recurring mistake, module first contact, BACKLOG task pickup, temporal reference, structural echo, vague back-reference
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-recall

## トリガー (検討せず呼び出す)

| トリガー                     | シグナル                                    |
| ---------------------------- | ------------------------------------------- |
| 時間的参照                   | 「前に」「あの時」過去の出来事 / 判断       |
| 構造的エコー                 | 現在の問題が過去の状況と似ている            |
| 繰り返し                     | 「また同じ」反復ミス                        |
| 曖昧な後方参照               | 「あの件」具体性のない過去の作業            |
| モジュール初回接触           | このセッションでファイル / モジュール初編集 |
| BACKLOG タスクのピックアップ | BACKLOG.md からタスク開始                   |

## コマンド

| 目的                  | コマンド                                                        |
| --------------------- | --------------------------------------------------------------- |
| 検索                  | `recall search "query"` (短縮形 `recall "query"`)               |
| 直近 N 日             | `recall search "query" --days N`                                |
| プロジェクト フィルタ | `recall search "query" --project <path>`                        |
| ソース フィルタ       | `recall search "query" --source claude` または `--source codex` |
| 結果数制限            | `recall search "query" --limit N` (デフォルト 10, 最大 100)     |
| セッション表示        | `recall show <session-id>`                                      |
| ステータス            | `recall status`                                                 |
| 増分インデックス      | `recall index`                                                  |
| 完全リビルド          | `recall index --force`                                          |

## use-cli-yomu との並列実行

過去の判断 (use-cli-recall) と現在のコード状態 (use-cli-yomu)。以下のトリガーで両方を並列実行する。

| トリガー             | recall クエリ            | yomu クエリ            |
| -------------------- | ------------------------ | ---------------------- |
| モジュール初回接触   | モジュール名、設計の根拠 | モジュール名、関連概念 |
| BACKLOG ピックアップ | タスク名、関連する判断   | タスクに関連するコード |
| 構造的エコー         | 過去の類似問題           | 現在の類似コード       |
