---
name: use-cli-heptabase
description: "heptabase CLI経由でHeptabaseのカード・ジャーナル・ノート・タグ・AI Tutorデータを読み書き。出力は全てJSON。Use when: Heptabase, ヘプタベース, card library, カード, note card, ノートカード, journal entry, ジャーナル, AI Tutor, タグ管理, knowledge base write, ナレッジベース書き込み."
allowed-tools: [Bash, Read]
user-invocable: false
---

# use-cli-heptabase

Heptabase CLI (`heptabase`, v0.1.0+)。デスクトップアプリ起動中かつ Settings → AI Features → CLI が ON であることが前提。

## 前提

最初に `heptabase start` で疎通確認。

| 出力                     | 意味                                  |
| ------------------------ | ------------------------------------- |
| `{"status":"ready",...}` | サーバー ready。続行可                |
| ハング / JSONでない      | アプリ未起動、または CLI トグル OFF   |

stderr に Electron の警告が毎回出るが無害。パース時は `2>/dev/null` で抑制。

## コマンド

| 目的                              | コマンド                                                           |
| --------------------------------- | ------------------------------------------------------------------ |
| サーバー ready 確認               | `heptabase start`                                                  |
| カード一覧 / 検索                 | `heptabase card list --limit N --offset M`                         |
| カードをゴミ箱へ / 復元           | `heptabase card trash <id>` / `heptabase card restore <id>`        |
| ノート作成 (markdown)             | `heptabase note create` (先頭 `# heading` がタイトル)              |
| ノート読取                        | `heptabase note read <cardId>`                                     |
| ノート追記 (markdown)             | `heptabase note append <cardId>`                                   |
| ノート全置換 (ProseMirror JSON)   | `heptabase note save <cardId>` (read で取得した `contentMd5` 必須) |
| ジャーナルCRUD (日付指定)         | `heptabase journal create|read|append|save <date>`                 |
| タグ一覧 / 作成 / 付与 / 削除     | `heptabase tag list|create|add|remove`                             |
| タグ配下のカード                  | `heptabase tag cards <tagId>`                                      |
| AI Tutor (読取専用)               | `heptabase goal|course|lesson ...`                                 |

引数の詳細は `heptabase <sub> -h` で確認 (subcommand ごとに flag が違う)。

## コンテンツ形式

| 操作              | 形式                                                      |
| ----------------- | --------------------------------------------------------- |
| `create` / `append` | Markdown                                                  |
| `read`            | ProseMirror JSON (`contentMd5` 同梱)                      |
| `save`            | ProseMirror JSON (直前 `read` の `contentMd5` 必須)       |

## 使い分け

| use-cli-heptabase                                  | 代替                                  |
| ---------------------------------------------- | ------------------------------------- |
| ナレッジベースへの書き込み (journal append など) | ローカル markdown リポ編集            |
| Card Library のタイトル / 更新日検索           | yomu (コード), kiku (Slack)           |
| AI Tutor の course / lesson / chat 読取        | なし                                  |

## Warm-up (セッション初回)

1. `heptabase start` で `{"status":"ready"}` 確認
2. `heptabase card list --limit 3` で read smoke test
3. 書き込み前に `heptabase <sub> -h` で引数確認
