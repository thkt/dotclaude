# ツール優先ルール

MCP tool > ビルトイン同等品。ToolSearch はキーワード検索で（`select:`
不可）。Bash コマンドは PreToolUse フックで RTK に自動リライト（手動操作不要）。

| 用途       | 使う                  | 使わない        | 条件                       |
| ---------- | --------------------- | --------------- | -------------------------- |
| URL fetch  | `mcp__scout__fetch`   | `WebFetch`      | 常時                       |
| Web search | `mcp__scout__search`  | `WebSearch`     | 常時                       |
| コード検索 | `mcp__yomu__explorer` | `Task(Explore)` | フロントエンド概念検索     |
|            | `Task(Explore)`       | —               | 非フロントエンド or 未登録 |

## yomu

フロントエンド (TS/TSX/JS/CSS/HTML) コード検索 → デフォルトで
`mcp__yomu__explorer`。embedding カバレッジ向上のため、簡単な検索でも yomu を優先する。

| yomu（デフォルト）                   | grep/glob（例外）                     |
| ------------------------------------ | ------------------------------------- |
| 概念: "form validation", "auth flow" | リテラル: エラー文言、正規表現        |
| 関連コード: "hooks that do Y"        | パス既知: `src/components/Button.tsx` |
| 識別子既知: `useAuth`                | ファイル一覧: `**/*.tsx`              |
| 名前不明: "where does X happen"      |                                       |

## RTK (Rust Token Killer)

トークン最適化CLIプロキシ。Bashコマンドはフックで自動リライト — 手動で `rtk`
プレフィックスは不要。

### メタコマンド（直接使用）

```bash
rtk gain              # トークン節約分析
rtk gain --history    # コマンド使用履歴と節約量
rtk discover          # Claude Code履歴から未活用機会を分析
```

### 注意事項

- 自動リライト対象: git, gh, cargo, vitest, tsc, eslint, docker, kubectl,
  curl 等
- `rtk gain` が失敗する場合: 別の rtk
  (reachingforthejack/rtk) がインストール済みの可能性
- 確認: `rtk --version` で `rtk X.Y.Z` が表示されること
