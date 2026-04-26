# Worktreeブートストラップ

隔離されたgit worktreeを作成し、Codex exec操作（build/test実行、adversarial
テスト生成）に備える。

## 手順

総タイムアウト300秒（オーケストレーター強制）。いずれかのステップ失敗または総時間超過で中止し、理由を報告する。

| Step | アクション           | タイムアウト | 失敗時                                  |
| ---- | -------------------- | ------------ | --------------------------------------- |
| 1    | worktree作成         | 10秒         | ブートストラップ中止                    |
| 2    | プロジェクト種別検出 | —            | ブートストラップ中止                    |
| 3    | 依存インストール     | 180秒        | ブートストラップ中止                    |
| 4    | Assert ビルド        | 120秒        | 中止（buildスクリプトなしならスキップ） |

### Step 1: Worktree作成

```bash
WORKTREE_BRANCH="assert-${SESSION_ID}"
WORKTREE_PATH=".claude/worktrees/assert-${SESSION_ID}"
git worktree add -b "$WORKTREE_BRANCH" "$WORKTREE_PATH" HEAD
```

worktreeパスが既存の場合、先に削除する。

```bash
git worktree remove "$WORKTREE_PATH" --force 2>/dev/null
git branch -D "$WORKTREE_BRANCH" 2>/dev/null
```

### Step 2: プロジェクト種別検出

| ファイル         | 種別    | 依存インストールコマンド | ビルドコマンド  |
| ---------------- | ------- | ------------------------ | --------------- |
| `package.json`   | Node.js | 下記npm検出参照          | `npm run build` |
| `Cargo.toml`     | Rust    | `cargo fetch`            | `cargo build`   |
| `Makefile`       | Make    | （スキップ）             | `make build`    |
| `Taskfile.yml`   | Task    | （スキップ）             | `task build`    |
| `pyproject.toml` | Python  | `pip install -e .`       | （スキップ）    |
| `Gemfile`        | Ruby    | `bundle install`         | （スキップ）    |

複数検出時はテーブル順で最初にマッチしたものを使用。

#### npm検出

| ロックファイル      | コマンド                         |
| ------------------- | -------------------------------- |
| `bun.lockb`         | `bun install --frozen-lockfile`  |
| `pnpm-lock.yaml`    | `pnpm install --frozen-lockfile` |
| `yarn.lock`         | `yarn install --frozen-lockfile` |
| `package-lock.json` | `npm ci`                         |
| （なし）            | `npm install`                    |

### Step 3: 依存インストール

検出されたインストールコマンドをworktreeディレクトリで実行する。stderrを取得し、非ゼロ終了時はエラー詳細とともに中止。

```bash
cd "$WORKTREE_PATH" && <install-command>
```

### Step 4: Assert ビルド

検出されたビルドコマンドを実行する。`package.json` に `build` スクリプトがない場合はスキップ。非ゼロ終了時はstderrの末尾30行とともに中止。

```bash
cd "$WORKTREE_PATH" && <build-command>
```

## クリーンアップ

Assert結果を問わず、オーケストレーターのfinallyブロックで常時実行する。

```bash
git worktree remove "$WORKTREE_PATH" --force
git branch -D "$WORKTREE_BRANCH"
```

## エラー報告

```markdown
Bootstrap: failed
Reason: {ステップN失敗: エラー詳細}
Impact: Outcome Assertion と adversarial testing をスキップ。静的のみモード。
```
