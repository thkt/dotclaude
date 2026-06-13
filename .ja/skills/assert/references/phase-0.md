# Phase 0: Worktree Bootstrap

Codex exec 操作 (テスト実行、adversarial test 生成) のために、隔離された git worktree を作成して準備する。あわせて fast-fail の build smoke test も実行する。プロジェクトがそもそも壊れている場合は、下流の並列作業を早期にスキップする。

## 手順

全体のタイムアウトは 300s で、orchestrator が強制する。いずれかの step が失敗するか 300s を超えたら中断し、理由をレポートする。

| Step | アクション             | タイムアウト | 失敗時の挙動                                                   |
| ---- | ---------------------- | ------------ | -------------------------------------------------------------- |
| 1    | Worktree 作成          | 10s          | bootstrap を中断                                               |
| 2    | プロジェクトタイプ検出 | -            | bootstrap を中断                                               |
| 3    | 依存インストール       | 180s         | bootstrap を中断                                               |
| 4    | Build smoke test       | 120s         | 中断 (build スクリプトがない場合はスキップ)。Phase 1c で再利用 |

### Step 1: Worktree 作成

```bash
WORKTREE_BRANCH="assert-${SESSION_ID}"
WORKTREE_PATH=".claude/worktrees/assert-${SESSION_ID}"
git worktree add -b "$WORKTREE_BRANCH" "$WORKTREE_PATH" HEAD
```

worktree パスが既に存在する場合は、先に削除する。

```bash
git worktree remove "$WORKTREE_PATH" --force 2>/dev/null
git branch -D "$WORKTREE_BRANCH" 2>/dev/null
```

### Step 2: プロジェクトタイプ検出

複数のファイルがマッチする場合は、表の上から順で最初にマッチしたものを使う。

| ファイル         | プロジェクトタイプ | 依存インストールコマンド | Build コマンド  |
| ---------------- | ------------------ | ------------------------ | --------------- |
| `package.json`   | Node.js            | 下記 npm 検出を参照      | `npm run build` |
| `Cargo.toml`     | Rust               | `cargo fetch`            | `cargo build`   |
| `Makefile`       | Make               | skip                     | `make build`    |
| `Taskfile.yml`   | Task               | skip                     | `task build`    |
| `pyproject.toml` | Python             | `pip install -e .`       | skip            |
| `Gemfile`        | Ruby               | `bundle install`         | skip            |

#### npm 検出

| Lock ファイル       | コマンド                         |
| ------------------- | -------------------------------- |
| `bun.lockb`         | `bun install --frozen-lockfile`  |
| `pnpm-lock.yaml`    | `pnpm install --frozen-lockfile` |
| `yarn.lock`         | `yarn install --frozen-lockfile` |
| `package-lock.json` | `npm ci`                         |
| なし                | `npm install`                    |

### Step 3: 依存インストール

検出したインストールコマンドを worktree ディレクトリで実行。stderr をキャプチャし、非ゼロ終了ならエラー詳細を添えて中断する。

```bash
cd "$WORKTREE_PATH" && <install-command>
```

### Step 4: Build smoke test

Phase 1 / 2 の並列処理を起動する前に、検出した build コマンドを fast-fail ガードとして実行する。`package.json` に `build` スクリプトが存在しない場合は、build の概念を持たないプロジェクトとしてスキップし、Evidence 表の Build 列を `skipped` として caveat パスへ分岐する。

build を一度で済ますため、結果を記録して Phase 1c で再利用する。

```bash
cd "$WORKTREE_PATH" && <build-command>
```

Step 4 の失敗は、Step 1-3 の環境的失敗とは意味が異なる。ハングした build は壊れた build と区別できない。これを環境的失敗として扱うと Ready (caveat) に到達してしまうため、Step 4 開始後に発火したタイムアウトも fail として扱う。

| 結果                               | Build 列  | Phase 1c, 2a |
| ---------------------------------- | --------- | ------------ |
| Exit 0 (pass)                      | `pass`    | 続行         |
| 非ゼロ (build broken)              | `fail`    | スキップ     |
| タイムアウト (120s / overall 300s) | `fail`    | スキップ     |
| build スクリプトなし               | `skipped` | 続行         |

## クリーンアップ

すべての phase を try / finally で囲み、結果に関わらず cleanup を保証する。

```bash
git worktree remove <worktree-path> --force
git branch -D assert-<session-id>
```

## エラーレポート

```markdown
Bootstrap: failed
Reason: {step N failed: error detail}
Impact: Outcome assertion and adversarial testing skipped. Static-only mode.
```
