---
name: verify
description: |
  Codex + audit reviewersによる独立したoutcome-basedの検証。
  検証して, verify, 独立検証, outcome verification,
  trust score, adversarial testing に言及した場合に使用。
  手軽なコードレビューには /polish、静的分析のみには /audit を使用。
allowed-tools: Bash(codex:*), Bash(git worktree:*), Bash(git diff:*),
  Bash(git status:*), Bash(git log:*), Bash(git branch:*),
  Bash(npm ci:*), Bash(npm run:*), Bash(npm test:*),
  Bash(cargo:*), Bash(make:*), Bash(bun:*), Bash(pnpm:*),
  Bash(yarn:*), Bash(which:*), Bash(date:*), Bash(rm:*),
  Read, Write, Grep, Glob, LS, Task, AskUserQuestion
model: opus
argument-hint: "[targetモード用のファイルパスまたはディレクトリ]"
user-invocable: true
---

# /verify - 独立 Outcome-Based 検証

Codexが隔離worktreeで独立検証する。Claude Codeがオーケストレーションと統合を担当。
Trust Scoreが静的+動的ソースからのreconciled evidenceを定量化する。

## 合理化カウンター

| 言い訳                               | 反論                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| 「テスト通ってるから正しい」         | あなたのテスト、あなたの環境。独立検証がそのギャップを埋める   |
| 「Codexも同じバグ見つけるだけ」      | モデルが違う＝盲点が違う。それが価値                           |
| 「adversarial testingは時間かかる」  | 時間超過ならスキップ。Trust Scoreはgraceful degradeする        |
| 「コードレビューですでにカバー済み」 | レビューはコードを読む。検証はコードを動かす。異なるエビデンス |

## 入力

| 引数 | 値                             | 結果                      |
| ---- | ------------------------------ | ------------------------- |
| `$1` | ファイルパスまたはディレクトリ | `target` モード           |
| `$1` | 省略（変更あり）               | `diff` モード（自動検出） |

## モード選択

| 条件                                  | モード   | スコープ                     |
| ------------------------------------- | -------- | ---------------------------- |
| `$1` がファイルパスまたはディレクトリ | `target` | 指定パス                     |
| `$1` なし、未コミット変更あり         | `diff`   | 変更ファイル（未コミット）   |
| `$1` なし、ベースブランチから差分あり | `diff`   | 変更ファイル（ブランチdiff） |
| `$1` なし、変更なし                   | —        | 中止: "検証対象なし"         |

ベースブランチ検出: `main`（デフォルト）、`--base <branch>` で上書き。

## 実行

| Phase | アクション                    | 依存      |
| ----- | ----------------------------- | --------- |
| 0     | Worktreeブートストラップ      | —         |
| 1     | エビデンス収集（並列）        | Phase 0   |
| 2     | 深層検証（並列）              | Phase 1   |
| 2.5   | Intent検証（adversarial結果） | Phase 2   |
| 3     | エビデンス統合                | Phase 2.5 |
| final | Worktreeクリーンアップ        | 常時      |

### Phase 0: Worktreeブートストラップ

[`references/bootstrap.md`](references/bootstrap.md)の手順に従う。

| 制約         | 値                                                               |
| ------------ | ---------------------------------------------------------------- |
| タイムアウト | 300秒                                                            |
| 失敗時       | Phase 1c, 2a スキップ → 静的検証のみで続行。理由をレポートに記録 |

### Phase 1: エビデンス収集（並列）

3タスクをTask（バックグラウンド）で並列起動し、全完了後にPhase 2へ進む。

| タスク          | 実行者             | アクション                    |
| --------------- | ------------------ | ----------------------------- |
| Codexレビュー   | Codex CLI (Bash)   | 変更/対象コードの静的レビュー |
| Auditレビューア | Claude Code agents | ドメイン別の静的分析          |
| Outcomeチェック | Codex CLI (Bash)   | worktreeでのbuild + test実行  |

#### 1a. Codex静的レビュー

| モード             | コマンド                                                       |
| ------------------ | -------------------------------------------------------------- |
| diff（未コミット） | `codex review --uncommitted`                                   |
| diff（ブランチ）   | `codex review --base $BASE`                                    |
| target             | `codex review --uncommitted`（対象ファイルのコンテキスト付き） |

| Codex severity | 正規化 |
| -------------- | ------ |
| `[P1]`         | high   |
| `[P2]`         | medium |
| `[P3]`         | 除外   |

file:lineなしまたはスコープ外のfindingsはスキップ。

#### 1b. Auditレビューア

/auditファイルルーティングテーブル（`skills/audit/SKILL.md` § ファイルルーティング）
を使用。ファイルタイプごとに同じレビューアを割り当て。

各レビューアをスタンドアロンのバックグラウンドTaskとして起動する。

| 制約         | 値                                      |
| ------------ | --------------------------------------- |
| 入力         | 割り当てファイルリスト + finding-schema |
| 並列上限     | 10（超過時バッチ）                      |
| タイムアウト | レビューアごと120秒                     |

#### 1c. Outcome検証（worktreeでのCodex exec）

Phase 0成功が前提。失敗時スキップ。

```bash
codex exec -C <worktree-path> "Run the project build and test commands. \
Report: (1) build exit code and last 50 lines of stderr if non-zero, \
(2) test exit code and last 50 lines of stderr if non-zero, \
(3) test summary (total/passed/failed)."
```

| 制約         | 値                                               |
| ------------ | ------------------------------------------------ |
| タイムアウト | 600秒                                            |
| 取得         | build pass/fail + test pass/fail（各stderr付き） |

### Phase 1→2 移行: Finding重複排除

1. Codexとレビューアのfindingsを `file:line:category` で重複排除
2. 衝突時はseverityが高いほうを保持
3. 重複排除済みセットをPhase 2のchallengerとverifierに渡す

### Phase 2: 深層検証（並列）

3タスクを並列起動:

| タスク           | 実行者                | 入力                         |
| ---------------- | --------------------- | ---------------------------- |
| Adversarial test | Codex CLI (Bash)      | worktree内の対象コード       |
| Challenger       | devils-advocate-audit | 重複排除済みPhase 1 findings |
| Verifier         | evidence-verifier     | 重複排除済みPhase 1 findings |

#### 2a. Adversarial Testing（worktreeでのCodex exec）

Phase 0成功が前提。失敗時スキップ。

[`references/adversarial.md`](references/adversarial.md) protocol.

| 制約         | 値    |
| ------------ | ----- |
| タイムアウト | 600秒 |

#### 2b. Challenger + Verifier

| Task       | subagent_type         | 入力                         |
| ---------- | --------------------- | ---------------------------- |
| Challenger | devils-advocate-audit | 重複排除済みPhase 1 findings |
| Verifier   | evidence-verifier     | 重複排除済みPhase 1 findings |

各120秒タイムアウト。バックグラウンドTask。

### Phase 2.5: Intent検証

Phase 2a結果返却後、オーケストレーターが失敗テストをトリアージ。

[`references/adversarial.md`](references/adversarial.md) § Intent検証のverdictルール適用:
assertion + 対象コード → intentソース検索 → verdict（exclude or promote 0.70+）。

### Phase 3: エビデンス統合

`evidence-integrator` をバックグラウンドTaskで起動。

| 入力                | ソース                      |
| ------------------- | --------------------------- |
| Reconciled findings | Challenger + verifier出力   |
| Outcome evidence    | Phase 1c build/test結果     |
| Adversarial results | Phase 2.5 promoted findings |

返却: root causes + Trust Score + レポート。
[`references/trust-score.md`](references/trust-score.md) § Trust Scoreアルゴリズム。

### クリーンアップ（常時）

成功・失敗を問わず全フェーズをtry/finallyで囲み、クリーンアップを保証する。

```bash
git worktree remove <worktree-path> --force
git branch -D verify-<session-id>
```

## レポート

[`references/trust-score.md`](references/trust-score.md) § レポート形式。

```markdown
## 検証レポート

Trust Score: NN/100
[コンポーネント内訳テーブル]

Mode: {diff (main) | diff (uncommitted) | target}
Scope: {ファイル数} files
Bootstrap: {success | failed: 理由}

### Root Causes

[インテグレーターより: RC-001... description, category, findings, action付き]

### Findings

[High / Medium severity テーブル: Source, File:Line, Description, Evidence]

### Adversarial Test Results

[テスト名, 対象, 結果, verdictをテストごとに]

### Outcome Evidence

[build/test pass/fail とstderr抜粋]
```

## エラーハンドリング

| エラー                                | リカバリー                                    |
| ------------------------------------- | --------------------------------------------- |
| codex 未インストール                  | インストール手順表示、中止                    |
| ブートストラップタイムアウト（300秒） | outcome + adversarialスキップ、静的のみモード |
| Codex review 失敗                     | エラーログ、auditレビューアのみで続行         |
| Codex exec タイムアウト（600秒）      | 該当フェーズスキップ、レポートに記録          |
| レビューアストール（120秒）           | 該当レビューアなしで続行、警告ログ            |
| Challengerストール                    | verifierのみで続行                            |
| Verifierストール                      | challengerのみで続行                          |
| インテグレーターストール              | リーダーが手動統合（簡略レポート）            |
| 全ソースからfindingsなし              | Trust Score = 100、"問題なし" レポート        |
| Worktreeクリーンアップ失敗            | 警告ログ、手動クリーンアップを提案            |

## エスカレーション

| 条件                                      | アクション                     |
| ----------------------------------------- | ------------------------------ |
| reconciled finding 1件以上                | マージブロック、`/fix` を提案  |
| アーキテクチャ root causes 発見           | 設計レビューに `/think` を提案 |
| Adversarial testsがカバレッジギャップ露呈 | テスト追加に `/code` を提案    |

## 確認事項

| チェック                              | 必須 |
| ------------------------------------- | ---- |
| モード検出済み？                      | Yes  |
| ブートストラップ試行済み？            | Yes  |
| Phase 1 エビデンス生成済み？          | Yes  |
| Phase 2 challenger/verifier実行済み？ | Yes  |
| インテグレーターレポート生成済み？    | Yes  |
| Trust Score 表示済み？                | Yes  |
| Worktreeクリーンアップ済み？          | Yes  |
