# ツール優先ルール

CLI
tool > ビルトイン同等品。Bash コマンドは PreToolUse フックで RTK に自動リライト（手動操作不要）。

| 用途       | 使う                  | 使わない        | 条件                       |
| ---------- | --------------------- | --------------- | -------------------------- |
| URL fetch  | `scout fetch`         | `WebFetch`      | 常時（Bash）               |
| Web search | `scout search`        | `WebSearch`     | 常時（Bash）               |
| GitHub     | `scout repo-overview` | `gh` / `fetch`  | リポジトリ概要（Bash）     |
| コード検索 | `yomu search`         | `Task(Explore)` | フロントエンド概念検索     |
|            | `Task(Explore)`       | —               | 非フロントエンド or 未登録 |
| セッション | `recall "query"`      | `Grep *.jsonl`  | 過去セッション検索         |

## scout

Web search & page fetch CLI。Bash で直接実行する。

```bash
scout search "query"                    # Web検索（Gemini Grounding）
scout fetch <url>                       # ページをMarkdownで取得
scout research "query"                  # 深層調査（検索+取得+レポート）
scout repo-overview owner/repo          # GitHubリポジトリ概要（stars, issues, PRs, releases, README）
scout repo-tree owner/repo              # リモートGitHubリポジトリのファイル一覧
scout repo-read owner/repo path/to/file # リモートGitHubリポジトリのファイル読み取り
```

## yomu

フロントエンド (TS/TSX/JS/CSS/HTML) コード検索 CLI。Bash で直接実行する。

```bash
yomu search "query"           # セマンティックコード検索（概念、識別子、関連コード）
yomu search "query" --limit 5 # 結果数制限
yomu index                    # チャンクインデックスの増分更新
yomu rebuild                  # チャンクインデックスの再構築
yomu impact <file_or_symbol>  # 変更の影響範囲分析
yomu status                   # インデックス統計情報の表示
```

embedding カバレッジ向上のため、簡単な検索でも yomu を優先する。

| yomu（デフォルト）                   | grep/glob（例外）                     |
| ------------------------------------ | ------------------------------------- |
| 概念: "form validation", "auth flow" | リテラル: エラー文言、正規表現        |
| 関連コード: "hooks that do Y"        | パス既知: `src/components/Button.tsx` |
| 識別子既知: `useAuth`                | ファイル一覧: `**/*.tsx`              |
| 名前不明: "where does X happen"      |                                       |

## recall

過去の Claude Code / Codex セッション検索 CLI（FTS5）。Bash で直接実行する。

```bash
recall "query"                    # 全セッションを全文検索
recall "query" --days 7           # 直近N日のみ
recall "query" --project /path    # プロジェクトパスでフィルタ（前方一致）
recall "query" --limit 5          # 最大結果数（デフォルト: 10）
recall --reindex                  # インデックスの強制再構築
```

| recall（デフォルト）                  | Grep \*.jsonl（例外）        |
| ------------------------------------- | ---------------------------- |
| 過去の解決策: "Xをどう直したか"       | 現在のセッションのみ         |
| パターン想起: "Yに使ったツールは"     | 特定の既知セッションファイル |
| プロジェクト横断: "Zをどこで使ったか" |                              |

## RTK (Rust Token Killer)

トークン最適化CLIプロキシ。Bashコマンドはフックで自動リライト — 手動で `rtk`
プレフィックスは不要。

### メタコマンド（直接使用）

```bash
rtk gain              # トークン節約分析
rtk gain --history    # コマンド使用履歴と節約量
rtk discover          # Claude Code履歴から未活用機会を分析
```

### 自動リライト対象

| カテゴリ     | コマンド                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Git/GitHub   | git (status/diff/log/add/commit/push/pull/branch/fetch/stash/show), gh (pr/issue/run/api/release) |
| ファイル操作 | cat/bat → read, rg/grep, ls/eza, tree, find/fd, diff, head                                        |
| JS/TS        | vitest, tsc, vue-tsc, eslint, prettier, playwright, prisma, npm run/test, pnpm test/lint/tsc      |
| Rust         | cargo (test/build/clippy/check/install/fmt)                                                       |
| Python       | pytest, ruff, pip, mypy (直接および `python -m`)                                                  |
| Go           | go (test/build/vet), golangci-lint                                                                |
| コンテナ     | docker (ps/images/logs/run/build/exec/compose), kubectl (get/logs/describe/apply)                 |
| ネットワーク | curl, wget                                                                                        |
| パッケージ   | pnpm (list/ls/outdated), uv pip                                                                   |

### 注意事項

- `rtk gain` が失敗する場合: 別の rtk
  (reachingforthejack/rtk) がインストール済みの可能性
- 確認: `rtk --version` で `rtk X.Y.Z` が表示されること
