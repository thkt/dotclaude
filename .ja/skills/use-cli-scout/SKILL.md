---
name: use-cli-scout
description: scout CLI 経由で Web 検索、ページ取得、GitHub リポジトリ探索を行う。
when_to_use: web search, page fetch, deep research, GitHub repo exploration, latest docs, release notes, library docs, external info, WebFetch alternative, WebSearch alternative, 最新ドキュメント, リリースノート, 外部情報
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-scout

## コマンド

| 目的               | コマンド                              |
| ------------------ | ------------------------------------- |
| Web 検索           | `scout search "query"`                |
| ページ取得         | `scout fetch <url>`                   |
| ディープリサーチ   | `scout research "topic"`              |
| リポジトリツリー   | `scout repo-tree <owner/repo>`        |
| リポジトリ読み取り | `scout repo-read <owner/repo> <path>` |
| リポジトリ概要     | `scout repo-overview <owner/repo>`    |

オプション、`--json` envelope、exit code、stdin 入力、実行例は `scout <subcommand> --help` を参照する。インストール済みバージョンの正典は help 出力。

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
