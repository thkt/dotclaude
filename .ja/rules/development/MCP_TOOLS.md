# MCP ツール優先ルール

## ルール

MCP tool > ビルトイン同等品。ToolSearch は `select:`
直接指名ではなくキーワード検索で MCP 候補を含めて比較する。

## Override Map

| 用途       | 使う                  | 使わない        | 条件                                           |
| ---------- | --------------------- | --------------- | ---------------------------------------------- |
| URL fetch  | `mcp__scout__fetch`   | `WebFetch`      | 常時                                           |
| Web search | `mcp__scout__search`  | `WebSearch`     | 常時                                           |
| コード探索 | `mcp__yomu__explorer` | `Task(Explore)` | フロントエンド (TS/TSX/JS/CSS/HTML) の概念検索 |
|            | `Task(Explore)`       | —               | 非フロントエンド、または yomu 未インデックス   |
