---
name: use-cli-gcloud
description: gcloud CLI 経由で Google Sheets と Docs にアクセスする。
when_to_use: Google Sheets/Docs URL, スプレッドシート, Sheets, Docs, Google ドキュメント
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-gcloud

## コマンド

| 種別   | URL パターン                      | デフォルト              | 構造化出力                                      |
| ------ | --------------------------------- | ----------------------- | ----------------------------------------------- |
| Sheets | `docs.google.com/spreadsheets/d/` | `gsheet "URL"` (CSV)    | `gsheet "URL" json` (JSONL, 表形式データ)       |
| Docs   | `docs.google.com/document/d/`     | `gdoc "URL"` (テキスト) | `gdoc "URL" md` (Markdown, 仕様書/ドキュメント) |
