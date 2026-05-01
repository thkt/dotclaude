---
name: use-cli-scout
description: scout CLI 経由で Web 検索、ページ取得、GitHub リポジトリ探索を行う。
when_to_use: web search, page fetch, deep research, GitHub repo exploration, latest docs, release notes, library docs, external info, WebFetch alternative, WebSearch alternative, 最新ドキュメント, リリースノート, 外部情報
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-scout

## コマンド

| 目的                        | コマンド                                                            |
| --------------------------- | ------------------------------------------------------------------- |
| Web 検索                    | `scout search "query"`                                              |
| 言語フィルタ                | `scout search "query" --lang ja` または `--lang en`                 |
| ページ取得                  | `scout fetch <url>`                                                 |
| ページ取得 (SPA)            | `scout fetch <url> --js`                                            |
| ページ取得 (raw)            | `scout fetch <url> --raw`                                           |
| ディープリサーチ            | `scout research "topic"`                                            |
| リサーチ深度                | `scout research "topic" --depth N` (1-10, デフォルト 3)             |
| リポジトリツリー            | `scout repo-tree <owner/repo>`                                      |
| リポジトリツリーフィルタ    | `scout repo-tree <owner/repo> --path <prefix>` / `--pattern <glob>` |
| 特定 ref のリポジトリツリー | `scout repo-tree <owner/repo> --ref <branch-or-tag-or-sha>`         |
| リポジトリ読み取り          | `scout repo-read <owner/repo> <path>`                               |
| リポジトリ読み取り (行範囲) | `scout repo-read <owner/repo> <path> --lines 1-80`                  |
| リポジトリ概要              | `scout repo-overview <owner/repo>`                                  |

## 使用判断

| use-cli-scout                        | 組み込み WebFetch / WebSearch     |
| ------------------------------------ | --------------------------------- |
| 最新ドキュメント、リリースノート     | 使わない (scout を優先)           |
| GitHub リポジトリ探索                | 使わない (scout repo-* を優先)    |
| 編集済みレポート付きディープリサーチ | 利用不可 (scout research を使用)  |
| Markdown クリーンなページ抽出        | WebFetch には Markdown 変換がない |

## 前提

| 環境変数       | 必須   | 用途                                |
| -------------- | ------ | ----------------------------------- |
| GEMINI_API_KEY | はい   | `scout search` / `scout research`   |
| GITHUB_TOKEN   | いいえ | `scout repo-*` のレート上限引き上げ |
