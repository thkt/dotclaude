---
name: use-cli-scout
description: "scout CLI経由でWeb検索・ページ取得・GitHubリポジトリ探索。Use when: web search, page fetch, deep research, GitHub repo exploration, latest docs, release notes, library docs, external info, WebFetch alternative, WebSearch alternative, 最新ドキュメント, リリースノート, 外部情報."
allowed-tools: [Bash, Read]
user-invocable: false
---

# use-cli-scout

## コマンド

| 目的                   | コマンド                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| Web 検索               | `scout search "query"`                                              |
| 言語フィルタ           | `scout search "query" --lang ja` or `--lang en`                     |
| ページ取得             | `scout fetch <url>`                                                 |
| ページ取得 (SPA)       | `scout fetch <url> --js`                                            |
| ページ取得 (raw)       | `scout fetch <url> --raw`                                           |
| ディープリサーチ       | `scout research "topic"`                                            |
| リサーチ深度           | `scout research "topic" --depth N` (1-10, default 3)                |
| リポツリー             | `scout repo-tree <owner/repo>`                                      |
| リポツリーフィルタ     | `scout repo-tree <owner/repo> --path <prefix>` / `--pattern <glob>` |
| リポツリー指定 ref     | `scout repo-tree <owner/repo> --ref <branch-or-tag-or-sha>`         |
| リポ読取               | `scout repo-read <owner/repo> <path>`                               |
| リポ読取 行指定        | `scout repo-read <owner/repo> <path> --lines 1-80`                  |
| リポ概要               | `scout repo-overview <owner/repo>`                                  |

## 使い分け

| use-cli-scout                          | 組み込み WebFetch / WebSearch      |
| ---------------------------------- | ---------------------------------- |
| 最新ドキュメント・リリースノート   | 非推奨（scout を優先）             |
| GitHub リポジトリ探索              | 非推奨（scout repo-* を優先）      |
| ディープリサーチ・レポート生成     | 不可（scout research を使う）      |
| Markdown 綺麗なページ抽出          | WebFetch は Markdown 変換なし      |

## 前提

| 環境変数         | 必須 | 用途                                 |
| ---------------- | ---- | ------------------------------------ |
| `GEMINI_API_KEY` | Yes  | `scout search` / `scout research`    |
| `GITHUB_TOKEN`   | No   | `scout repo-*` のレート上限緩和      |
