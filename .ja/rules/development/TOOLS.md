# ツール優先ルール

CLI tool > ビルトイン同等品。

| 用途       | 使う                  | 使わない        | 条件                       |
| ---------- | --------------------- | --------------- | -------------------------- |
| URL fetch  | `scout fetch`         | `WebFetch`      | 常時（Bash）               |
| Web search | `scout search`        | `WebSearch`     | 常時（Bash）               |
| GitHub     | `scout repo-overview` | `gh` / `fetch`  | リポジトリ概要（Bash）     |
| コード検索 | `yomu search`         | `Task(Explore)` | フロントエンド概念検索     |
|            | `Task(Explore)`       | —               | 非フロントエンド or 未登録 |
| セッション | `recall search "query"` | `Grep *.jsonl` | 過去セッション検索        |

## scout

Web search & page fetch CLI。Bashで直接実行する。

```bash
scout search "query"                    # Web検索（Gemini Grounding）
scout fetch <url>                       # ページをMarkdownで取得
scout research "query"                  # 深層調査（検索+取得+レポート）
scout repo-overview owner/repo          # GitHubリポジトリ概要（stars, issues, PRs, releases, README）
scout repo-tree owner/repo              # リモートGitHubリポジトリのファイル一覧
scout repo-read owner/repo path/to/file # リモートGitHubリポジトリのファイル読み取り
```

## yomu

フロントエンド (TS/TSX/JS/CSS/HTML) コード検索CLI。Bashで直接実行する。

```bash
yomu search "query"           # セマンティックコード検索（概念、識別子、関連コード）
yomu search "query" --limit 5 # 結果数制限
yomu index                    # チャンクインデックスの増分更新
yomu rebuild                  # チャンクインデックスの再構築
yomu impact <file_or_symbol>  # 変更の影響範囲分析
yomu status                   # インデックス統計情報の表示
```

embeddingカバレッジ向上のため、簡単な検索でもyomuを優先する。

| yomu（デフォルト）                   | grep/glob（例外）                     |
| ------------------------------------ | ------------------------------------- |
| 概念: "form validation", "auth flow" | リテラル: エラー文言、正規表現        |
| 関連コード: "hooks that do Y"        | パス既知: `src/components/Button.tsx` |
| 識別子既知: `useAuth`                | ファイル一覧: `**/*.tsx`              |
| 名前不明: "where does X happen"      |                                       |

## recall

過去のClaude Code / Codexセッション検索CLI（FTS5）。Bashで直接実行する。

```bash
recall search "query"                    # 全セッションをセマンティック検索
recall search "query" --days 7           # 直近N日のみ
recall search "query" --project /path    # プロジェクトパスでフィルタ（前方一致）
recall search "query" --limit 5          # 最大結果数（デフォルト: 10）
recall index                             # インデックスの増分更新
recall status                            # インデックス統計情報の表示
```

| recall（デフォルト）                  | Grep \*.jsonl（例外）        |
| ------------------------------------- | ---------------------------- |
| 過去の解決策: "Xをどう直したか"       | 現在のセッションのみ         |
| パターン想起: "Yに使ったツールは"     | 特定の既知セッションファイル |
| プロジェクト横断: "Zをどこで使ったか" |                              |

### 能動的活用

意思決定ではなくパターン認識。以下のパターンを検知したら
`recall search "関連クエリ"` を呼ぶ。迷わない。

| パターン | シグナル |
| --- | --- |
| 時間参照 | 「前に」「あの時」「この前」、過去のイベントや判断への言及 |
| 構造的類似 | 今の問題/設計が過去の状況と似ている |
| 反復 | 「また同じ」「繰り返し」、再発するミスやパターン |
| 曖昧な後方参照 | 「あの件」「前にやったやつ」、詳細不明の過去作業への言及 |
| モジュール初接触 | このセッションで未触のファイル/モジュールを編集しようとしている |
| BACKLOGタスク着手 | BACKLOG.md からタスクを開始 |

