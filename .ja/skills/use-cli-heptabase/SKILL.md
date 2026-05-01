---
name: use-cli-heptabase
description: heptabase CLI 経由で Heptabase のカード、ジャーナル、ノート、タグ、AI Tutor データを読み書きする。出力はすべて JSON。
when_to_use: Heptabase, ヘプタベース, card library, カード, note card, ノートカード, journal entry, ジャーナル, AI Tutor, タグ管理, knowledge base write, ナレッジベース書き込み
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-heptabase

Heptabase CLI (`heptabase`, v0.1.0+)。Desktop アプリが起動済みで CLI が有効化されている必要がある (Settings, AI Features, CLI)。

## 前提

最初に `heptabase start` を実行する。

| 出力                     | 意味                                       |
| ------------------------ | ------------------------------------------ |
| `{"status":"ready",...}` | サーバー起動済み。続行可                   |
| ハング / 非 JSON         | Desktop アプリ未起動または CLI トグル オフ |

Electron は呼び出しごとに無害な warning を stderr に出力する。パース時は `2>/dev/null` で抑制する。

## コマンド

| 目的                                  | コマンド                                                           |        |                         |              |
| ------------------------------------- | ------------------------------------------------------------------ | ------ | ----------------------- | ------------ |
| サーバー ready チェック               | `heptabase start`                                                  |        |                         |              |
| カード一覧 / 検索                     | `heptabase card list --limit N --offset M`                         |        |                         |              |
| カードのゴミ箱送り / 復元             | `heptabase card trash <id>` / `heptabase card restore <id>`        |        |                         |              |
| ノート作成 (markdown)                 | `heptabase note create` (最初の `# heading` がタイトル)            |        |                         |              |
| ノート読み取り                        | `heptabase note read <cardId>`                                     |        |                         |              |
| ノート追記 (markdown)                 | `heptabase note append <cardId>`                                   |        |                         |              |
| ノート置換 (ProseMirror JSON)         | `heptabase note save <cardId>` (read で取得した `contentMd5` 必要) |        |                         |              |
| 日付ごとのジャーナル CRUD             | `heptabase journal create                                          | read   | append                  | save <date>` |
| タグ list / create / add / remove     | `heptabase tag list                                                | create | add                     | remove`      |
| タグ配下のカード                      | `heptabase tag cards <tagId>`                                      |        |                         |              |
| AI Tutor の goals / courses / lessons | `heptabase goal                                                    | course | lesson ...` (read-only) |              |

引数の詳細は `heptabase <sub> -h` を参照 (フラグはサブコマンドごとに異なる)。

## コンテンツ形式

| 操作            | 形式                                                         |
| --------------- | ------------------------------------------------------------ |
| create / append | Markdown                                                     |
| read            | ProseMirror JSON (`contentMd5` を返す)                       |
| save            | ProseMirror JSON (`read` で取得した最新 `contentMd5` が必要) |

## 使用判断

| use-cli-heptabase                                       | 代替                               |
| ------------------------------------------------------- | ---------------------------------- |
| ナレッジベースへの書き戻し (ジャーナル追記、ノート作成) | ローカル markdown リポジトリの編集 |
| タイトル / 最近性によるカードライブラリ参照             | yomu (コード), kiku (Slack)        |
| AI Tutor のコース / レッスン / チャット読み取り         | n/a                                |

## ウォームアップ (セッション初回利用時)

1. `heptabase start` が `{"status":"ready"}` を返す
2. `heptabase card list --limit 3` で読み取りスモークテスト
3. 初回書き込み前に該当サブコマンドで `-h` を確認
