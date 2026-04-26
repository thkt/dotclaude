---
name: use-cli-gcloud
description: gcloud CLI経由でGoogle SheetsとDocsにアクセスする。Use when: Google Sheets/Docs URL, スプレッドシート, Sheets, Docs, Google ドキュメント.
allowed-tools: [Bash, Read]
user-invocable: false
---

# use-cli-gcloud

## コマンド

| タイプ | URLパターン                       | デフォルト              | 構造化                                          |
| ------ | --------------------------------- | ----------------------- | ----------------------------------------------- |
| Sheets | `docs.google.com/spreadsheets/d/` | `gsheet "URL"` (CSV)    | `gsheet "URL" json` (JSONL, 表形式)             |
| Docs   | `docs.google.com/document/d/`     | `gdoc "URL"` (テキスト) | `gdoc "URL" md` (Markdown, 仕様/ドキュメント)   |
