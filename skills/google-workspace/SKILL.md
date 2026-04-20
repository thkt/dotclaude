---
name: google-workspace
description: Access Google Sheets and Docs via gcloud CLI. Use when: Google Sheets/Docs URL, スプレッドシート, Sheets, Docs, Google ドキュメント.
allowed-tools: [Bash, Read]
user-invocable: false
---

# Google Workspace

## Commands

| Type   | URL Pattern                       | Default                 | Structured                                      |
| ------ | --------------------------------- | ----------------------- | ----------------------------------------------- |
| Sheets | `docs.google.com/spreadsheets/d/` | `gsheet "URL"` (CSV)    | `gsheet "URL" json` (JSONL, tabular data)       |
| Docs   | `docs.google.com/document/d/`     | `gdoc "URL"` (text)     | `gdoc "URL" md` (Markdown, specs/documents)     |
