---
name: scribe-setup
description: 対象リポを scribe（コード構造の docs/wiki 蓄積機構）の巡回対象に整える。wiki 規約 README の配置と scribe ラベル作成を行う。
when_to_use: このリポを scribe に追加, wiki 蓄積を始めたい, scribe setup, wiki 蓄積の準備
allowed-tools: Bash Read Write Edit Glob Grep
---

# scribe セットアップ

対象リポを `~/.claude/scribe` の巡回対象に整える。機構本体は触らず、対象リポ側に `docs/wiki/README.md` と GitHub の scribe ラベルを揃える。`docs/wiki/README.md` の存在自体が巡回対象の印になる（登録簿は無い）。

対象リポは引数のパス、無ければ cwd。以降 `<repo>` はその絶対パス。

## Phase 1. 対象リポの把握

1. `<repo>` を絶対パスに解決し `cd <repo>`。git リポでなければ中止して理由を伝える。
2. 既存状態を確認する。`docs/wiki/README.md` があれば「セットアップ済み。再実行は既存を上書きするか」をユーザーに確認してから進む。
3. `gh repo view --json nameWithOwner -q .nameWithOwner` で slug を取る。取れないリポ（GitHub リモート無し）は scribe 対象にできない旨を伝えて中止する。
4. `<repo>` が run.sh の SCAN_ROOTS（`~/Personal`, `~/GitHub/*/*`）の外なら、定期巡回に乗らず手動実行のみになる旨をユーザーに伝える。

## Phase 2. wiki 規約 README の配置

```bash
mkdir -p <repo>/docs/wiki
cp ~/.claude/scribe/wiki-readme.template.md <repo>/docs/wiki/README.md
```

雛形は汎用なので基本そのまま。リポ固有の書式追加があればここで足す。既存 README があれば上書き前に差分をユーザーに確認する。

## Phase 3. scribe ラベル作成

PR に付けるラベルを対象リポに一度だけ作る。scribe の差分基準（最後にマージされた scribe PR の検索）もこのラベルに依存する。

```bash
gh label create scribe -R <owner/repo> -c '#0E8A16' -d 'scribe が提案する wiki 更新' 2>/dev/null || true
```

## Phase 4. 初回実行の確認

「初回巡回（コードベース全体を読んで wiki を基礎化し PR を作る）を今流すか」をユーザーに確認する。流す場合:

```bash
~/.claude/scribe/run.sh <repo の絶対パス>
```

codex が動くため 1 リポあたり約 2 分・十数万トークンかかる。完了後 PR URL を伝える。承認はユーザーがその PR をマージすること。scribe は直接デフォルトブランチに触れない。
