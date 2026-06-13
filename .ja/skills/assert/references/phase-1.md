# Phase 1: Evidence Collection (並列)

Task (background) で 3 つを並列に起動する。すべて完了したら Phase 2 に進む。

| Task            | 実行者             | アクション                                                          |
| --------------- | ------------------ | ------------------------------------------------------------------- |
| Codex review    | Codex CLI (Bash)   | 変更/対象コードの静的レビュー                                       |
| Audit reviewers | Claude Code agents | ドメイン特化の静的解析                                              |
| Test execution  | Codex CLI (Bash)   | worktree 内で test コマンド実行 (build は bootstrap smoke を再利用) |

## 1a. Codex 静的レビュー

| Mode               | コマンド                                                          |
| ------------------ | ----------------------------------------------------------------- |
| diff (uncommitted) | `codex review --uncommitted`                                      |
| diff (branch)      | `codex review --base $BASE`                                       |
| target             | `codex review --uncommitted` (対象ファイルのコンテキスト copy 後) |

severity は次表で正規化する。file:line を持たない finding とスコープ外の finding はスキップする。

| Codex severity | 正規化 |
| -------------- | ------ |
| `[P1]`         | high   |
| `[P2]`         | medium |
| `[P3]`         | drop   |

## 1b. Audit Reviewers

`/audit` のファイルルーティング表をそのまま使う。ファイルタイプごとの reviewer 割り当ても同じ表に従う。ルーティング表側の変更は、`/assert` の reviewer 割り当てにもそのまま波及する。

各 reviewer はそれぞれ独立した background Task として起動する。

| 制約         | 値                                    |
| ------------ | ------------------------------------- |
| 入力         | 割り当てファイル一覧 / finding-schema |
| 最大並列     | 10 (超過時はバッチ分割)               |
| タイムアウト | reviewer ごと 120s                    |

## 1c. テスト実行 (worktree 内で Codex exec)

Phase 0 の成功が前提で、失敗していた場合はスキップする。build はここでは再実行せず、orchestrator が bootstrap smoke test (Step 4) の結果を Evidence 表の Build 列にそのまま使う。

```bash
codex exec -C <worktree-path> "Run the project test command. Report: (1) test exit code and last 50 lines of stderr if non-zero, (2) test summary (total/passed/failed)."
```

| 制約         | 値                                                          |
| ------------ | ----------------------------------------------------------- |
| タイムアウト | 600s                                                        |
| 取得         | test pass / fail (stderr 付き)。Build 値は bootstrap 再利用 |

## Phase 1 から 2 への遷移: Finding 重複除去

`file:line` をキーに重複除去する。category schema はソース間で異なるため、キーには含めない。ソースタグは追跡性のために保持し、複数ソースで検出された finding は `[codex, reviewer-security]` のように記録する。

| Step | アクション                                                    |
| ---- | ------------------------------------------------------------- |
| 1    | Codex と reviewer の findings を `file:line` で重複除去する   |
| 2    | 衝突時は最高 severity を残し、ソースタグはすべて保持する      |
| 3    | 重複除去済みセットを Phase 2 の challenger と verifier に渡す |
