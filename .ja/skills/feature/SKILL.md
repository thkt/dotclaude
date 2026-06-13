---
name: feature
description: 探索、アーキテクチャ、TDD、品質ゲートを通した包括的な機能開発。計画なしの実装には使わない (/code を使う)。バグ修正には使わない (/fix を使う)。実装なしの計画のみにも使わない (/think を使う)。
when_to_use: 機能開発, 新機能, 機能追加, feature development
allowed-tools: Skill Bash(npm run) Bash(npm run:*) Bash(npm test:*) Bash(yarn run) Bash(yarn run:*) Bash(pnpm run) Bash(pnpm run:*) Bash(bun run) Bash(bun run:*) Bash(make:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(git ls-files:*) Bash(git worktree *) Bash(git merge *) Bash(git branch *) Bash(date:*) Bash(mkdir:*) Bash(agent-browser:*) Edit MultiEdit Write Read LS Task TaskCreate TaskList TaskUpdate AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
effort: xhigh
argument-hint: "[feature description]"
---

# /feature - 機能開発オーケストレーター

/think → /code → /audit を連結して end-to-end の機能開発を行う。

## プラグイン依存

agent-browser がインストールされていない場合は Phase 5 を gracefully にスキップする。

| プラグイン    | 必要な箇所   | インストール                      |
| ------------- | ------------ | --------------------------------- |
| agent-browser | Phase 5 のみ | `claude plugin add agent-browser` |

## 入力

- 機能説明は `$ARGUMENTS` から取る (任意)
- 空の場合 → AskUserQuestion で問い合わせる (コンテキスト適応の選択肢)

### コンテキスト適応の選択肢

プロジェクト種別を検出 → 関連選択肢を提示する。

| パターン           | 検出                                                          | 選択肢                                    |
| ------------------ | ------------------------------------------------------------- | ----------------------------------------- |
| Claude Code config | ${CLAUDE_SKILL_DIR}/../../ または `.claude/` に skills/hooks/ | Add skill, Add hook, Add agent            |
| React/Next.js      | package.json に `react`, `next`                               | Add component, Add page, Add API route    |
| API server         | Express, Fastify, Hono または `src/routes/`                   | Add endpoint, Add middleware, Add service |
| CLI tool           | package.json の bin または `src/cli/`                         | Add command, Add option, Add subcommand   |
| Library            | package.json の main/exports                                  | Add function, Add class, Add type         |
| Fallback           | マッチなし                                                    | New feature, Extension, Refactoring       |

## SOW コンテキスト

${CLAUDE_SKILL_DIR}/../\_lib/sow-resolution.md を参照。

## 実行

| Phase | 名称           | 動作                             | ユーザーチェックポイント |
| ----- | -------------- | -------------------------------- | ------------------------ |
| 1     | 探索           | コンテキストスキャン → PREFLIGHT | 不明点・推論を解消       |
| 2     | 設計           | Skill: /think                    | 設計承認                 |
| 3     | 実装           | Skill: /code                     | -                        |
| 4     | 品質ループ     | /audit → /fix loop (max 3)       | 残課題のみ               |
| 5     | ビジュアル検証 | ブラウザチェック (UI 変更時)     | ビジュアル承認           |
| 6     | サマリー       | AC カバレッジ + scope 報告       | 完了                     |

### Phase 1: 探索

1. CLAUDE.md, package.json, Cargo.toml などをコンテキストスキャン
2. `$ARGUMENTS` が空 → コンテキスト適応の選択肢で AskUserQuestion
3. PREFLIGHT を実行
4. 推論や不明点を解消
5. 対象ファイルが 2 以下なら早期終了 → `/code` を提案 (Phase 2-6 をスキップ)
6. TaskCreate で追跡 (Phase 2-6)

### Phase 2: 設計

`Skill("think", $ARGUMENTS)` を実行する。

出力は `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` + `spec.md`。

### Phase 3: 実装

`Skill("code", $ARGUMENTS)` を実行する。

/code は Phase 2 出力から SOW を自動検出する。

### Phase 4: 品質ループ

#### ループ

changed files は `git diff main...HEAD --name-only` で取得する。

| Step | 動作                                 | 終了条件                 |
| ---- | ------------------------------------ | ------------------------ |
| 1    | Skill: /audit (git で changed files) | 0 critical/high → 仕上げ |
| 2    | critical/high それぞれに Skill: /fix | → Step 3                 |
| 3    | iteration をインクリメント (max 3)   | 上限到達 → 仕上げ        |

#### 仕上げ

| Step | 動作                                | 終了条件                                   |
| ---- | ----------------------------------- | ------------------------------------------ |
| 1    | Skill: /polish → テスト pass を確認 | テスト失敗 → 修正 (max 2)。なお失敗 → 次へ |
| 2    | 残課題があれば提示                  | ユーザーが判断                             |

### Phase 5: ビジュアル検証

#### スキップ条件 (順に評価、最初の fail でスキップ)

| #   | チェック                         | 方法                                              | fail 時       |
| --- | -------------------------------- | ------------------------------------------------- | ------------- |
| 1   | changed files に UI ファイルあり | `.tsx`, `.jsx`, `.css`, `.scss`, `.html` にマッチ | skip (silent) |
| 2   | agent-browser インストール済み   | `which agent-browser`                             | skip (silent) |
| 3   | package.json に dev server あり  | `dev`, `start:dev`, `start` script にマッチ       | skip (silent) |

#### Dev Server 検出

`package.json` の scripts から検出する。script 値に明記があれば port を抽出する (`--port`, `-p`, `PORT=`)。

| 優先度 | script 名パターン        | デフォルト URL        |
| ------ | ------------------------ | --------------------- |
| 1      | dev, start:dev           | http://localhost:5173 |
| 2      | start                    | http://localhost:3000 |
| 3      | storybook, storybook:dev | http://localhost:6006 |

#### ワークフロー

1. dev server script と URL を検出
2. AskUserQuestion: "Dev server running at {url}? (Y to proceed / N to skip / custom URL)"
3. `agent-browser --headed open {url}` → SOW スコープに合致するページに遷移 (changed file パスや AC 記述から route を推定)
4. `agent-browser screenshot` → 現在の状態をキャプチャ
5. ビジュアル系キーワード (display, layout, UI, style, render, visible, responsive) を含む AC を確認
6. スクリーンショットと findings をユーザーに提示
7. AskUserQuestion: "Visual check OK?" (Approve / Request fix / Skip)
8. "Request fix" の場合 → Phase 4 ループ Step 2 に戻る
9. `agent-browser close`

### Phase 6: サマリー

サマリーを提示する。AC カバレッジは /code 品質ゲート で既に検証済み。

- 機能スコープ (変更ファイル、追加テスト)
- 品質イテレーションと残課題
- /code からの AC カバレッジ

## 再開

既存成果物から resume 地点を検出する。実装の根拠は `git diff main...HEAD --name-only` が SOW スコープに合致するファイルを示すこと。

| 成果物                           | Resume  |
| -------------------------------- | ------- |
| SOW なし                         | Phase 1 |
| SOW `draft`                      | Phase 2 |
| SOW `in-progress` で実装なし     | Phase 3 |
| 実装済みで品質チェック未完了     | Phase 4 |
| 品質 pass で UI ファイル変更あり | Phase 5 |
| 品質 pass で UI ファイル変更なし | Phase 6 |

## エラー処理

| エラー                            | 動作                              |
| --------------------------------- | --------------------------------- |
| /think がキャンセル・失敗         | コンテキストを保存して終了        |
| /code 失敗                        | エラーを提示しユーザーに尋ねる    |
| 品質ループ枯渇 (3 ラウンド)       | 残りを提示しユーザーが判断        |
| agent-browser 未インストール      | Phase 5 をスキップして Phase 6 へ |
| Dev server 未起動                 | Phase 5 をスキップして Phase 6 へ |
| /code 品質ゲート が AC 未達を表示 | Phase 3 か 4 への再入を提案       |

## 検証

| チェック             | 必須 |
| -------------------- | ---- |
| PREFLIGHT 通過?      | Yes  |
| SOW + Spec 生成済み? | Yes  |
| 全テスト pass?       | Yes  |
| /code AC カバレッジ? | Yes  |
