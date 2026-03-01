# MCP ツール優先ルール

MCP tool > ビルトイン同等品。ToolSearch はキーワード検索で（`select:` 不可）。

| 用途       | 使う                  | 使わない        | 条件                       |
| ---------- | --------------------- | --------------- | -------------------------- |
| URL fetch  | `mcp__scout__fetch`   | `WebFetch`      | 常時                       |
| Web search | `mcp__scout__search`  | `WebSearch`     | 常時                       |
| コード検索 | `mcp__yomu__explorer` | `Task(Explore)` | フロントエンド概念検索     |
|            | `Task(Explore)`       | —               | 非フロントエンド or 未登録 |

## yomu

フロントエンド (TS/TSX/JS/CSS/HTML) の概念・振る舞い・意図による検索 →
`mcp__yomu__explorer`。grep/glob で代替しない。

| yomu                                 | grep/glob                             |
| ------------------------------------ | ------------------------------------- |
| 概念: "form validation", "auth flow" | 識別子既知: `useAuth`                 |
| 関連コード: "hooks that do Y"        | パス既知: `src/components/Button.tsx` |
| 名前不明: "where does X happen"      | リテラル一致: エラー文言, class 名    |
