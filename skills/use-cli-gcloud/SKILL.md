---
name: use-cli-gcloud
description: Access Google Sheets and Docs via gcloud CLI.
when_to_use: Google Sheets/Docs URL, スプレッドシート, Sheets, Docs, Google ドキュメント
allowed-tools: Bash Read
user-invocable: false
---

# use-cli-gcloud

## Commands

| Type   | URL Pattern                       | Default              | Structured                                  |
| ------ | --------------------------------- | -------------------- | ------------------------------------------- |
| Sheets | `docs.google.com/spreadsheets/d/` | `gsheet "URL"` (CSV) | `gsheet "URL" json` (JSONL, tabular data)   |
| Docs   | `docs.google.com/document/d/`     | `gdoc "URL"` (text)  | `gdoc "URL" md` (Markdown, specs/documents) |
