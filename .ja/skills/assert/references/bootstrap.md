# Worktree Bootstrap

Codex exec 操作 (テスト実行、adversarial test 生成) のために、隔離された git worktree を作成し準備する。Bootstrap は fast-fail の build smoke test も実行し、プロジェクトが既に壊れている場合は下流の並列作業を早期にスキップする。

## 手順

合計タイムアウト 300s (orchestrator 強制)。いずれかの step 失敗または 300s 超過は中断し、理由をレポートする。

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

worktree パスが既存の場合、まず削除する。

```bash
git worktree remove "$WORKTREE_PATH" --force 2>/dev/null
git branch -D "$WORKTREE_BRANCH" 2>/dev/null
```

### Step 2: プロジェクトタイプ検出

| ファイル         | プロジェクトタイプ | 依存インストールコマンド | Build コマンド  |
| ---------------- | ------------------ | ------------------------ | --------------- |
| `package.json`   | Node.js            | 下記 npm 検出を参照      | `npm run build` |
| `Cargo.toml`     | Rust               | `cargo fetch`            | `cargo build`   |
| `Makefile`       | Make               | (skip)                   | `make build`    |
| `Taskfile.yml`   | Task               | (skip)                   | `task build`    |
| `pyproject.toml` | Python             | `pip install -e .`       | (skip)          |
| `Gemfile`        | Ruby               | `bundle install`         | (skip)          |

複数マッチ: 表の上から順で最初のものを使う。

#### npm 検出

| Lock ファイル       | コマンド                         |
| ------------------- | -------------------------------- |
| `bun.lockb`         | `bun install --frozen-lockfile`  |
| `pnpm-lock.yaml`    | `pnpm install --frozen-lockfile` |
| `yarn.lock`         | `yarn install --frozen-lockfile` |
| `package-lock.json` | `npm ci`                         |
| (なし)              | `npm install`                    |

### Step 3: 依存インストール

検出したインストールコマンドを worktree ディレクトリで実行。stderr をキャプチャ。非ゼロ終了でエラー詳細とともに中断。

```bash
cd "$WORKTREE_PATH" && <install-command>
```

### Step 4: Build Smoke Test

Phase 1 / 2 の並列処理を起動する前に、検出した build コマンドを fast-fail ガードとして実行する。`package.json` に `build` スクリプトがない場合はスキップ (Evidence 表で Build = `skipped`、これは環境的事象であり caveat パスに分岐)。

結果をキャプチャ。Phase 1c は build を再実行せずこの結果を読む。wall time は一度のみ支払う。

```bash
cd "$WORKTREE_PATH" && <build-command>
```

失敗の意味論 (Step 1-3 の環境的失敗と混同しない):

| 結果                  | Build 列  | Phase 1c, 2a | ゲートへの影響                                       |
| --------------------- | --------- | ------------ | ---------------------------------------------------- |
| Exit 0 (pass)         | `pass`    | 続行         | issues=0 なら Ready、issues>0 なら NotReady          |
| 非ゼロ (build broken) | `fail`    | スキップ     | NotReady (build fail は issues 数に関わらずブロック) |
| build スクリプトなし  | `skipped` | 続行         | issues=0 なら Ready、issues>0 なら NotReady          |

Step 4 fail はコードに対する判定 (build が本当に壊れている)、環境に対する判定ではない。Ready (caveat) には degrade しない。Step 1-3 失敗は環境的で、issues=0 なら Ready (caveat) に degrade する。

## Cleanup

assertion の結果に関わらず、orchestrator が finally ブロックで常に実行する。

```bash
git worktree remove "$WORKTREE_PATH" --force
git branch -D "$WORKTREE_BRANCH"
```

## エラーレポート

```markdown
Bootstrap: failed
Reason: {step N failed: error detail}
Impact: Outcome assertion and adversarial testing skipped. Static-only mode.
```
