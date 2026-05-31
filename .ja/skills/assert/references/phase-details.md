# Phase Details

各 assert phase の詳細実行手順。SKILL.md は phase ごとにこのファイルを参照する。

## Phase 1: Evidence Collection (Parallel)

Task (background) で 3 つを並列起動。すべて完了後 Phase 2 に進む。

| Task            | 実行者             | アクション                                                          |
| --------------- | ------------------ | ------------------------------------------------------------------- |
| Codex review    | Codex CLI (Bash)   | 変更/対象コードの静的レビュー                                       |
| Audit reviewers | Claude Code agents | ドメイン特化の静的解析                                              |
| Test execution  | Codex CLI (Bash)   | worktree 内で test コマンド実行 (build は bootstrap smoke を再利用) |

### 1a. Codex Static Review

| Mode               | コマンド                                                          |
| ------------------ | ----------------------------------------------------------------- |
| diff (uncommitted) | `codex review --uncommitted`                                      |
| diff (branch)      | `codex review --base $BASE`                                       |
| target             | `codex review --uncommitted` (対象ファイルのコンテキスト copy 後) |

| Codex severity | 正規化 |
| -------------- | ------ |
| `[P1]`         | high   |
| `[P2]`         | medium |
| `[P3]`         | drop   |

file:line がないもの、スコープ外のものはスキップ。

### 1b. Audit Reviewers

/audit のファイルルーティング表 (`skills/audit/SKILL.md` § File Routing) を使う。同じ reviewer 割り当てをファイルタイプごとに適用。

各 reviewer をスタンドアロンの background Task として起動。

| 制約         | 値                                    |
| ------------ | ------------------------------------- |
| 入力         | 割り当てファイル一覧 + finding-schema |
| 最大並列     | 10 (超過時はバッチ分割)               |
| タイムアウト | reviewer ごと 120s                    |

### 1c. Test Execution (worktree 内で Codex exec)

Phase 0 の成功が前提。失敗時はスキップ。ここでは build を再実行しない。orchestrator は bootstrap smoke test (Step 4) の結果を Evidence 表の Build 列で再利用する。

```bash
codex exec -C <worktree-path> "Run the project test command. \
Report: (1) test exit code and last 50 lines of stderr if non-zero, \
(2) test summary (total/passed/failed)."
```

| 制約         | 値                                                      |
| ------------ | ------------------------------------------------------- |
| タイムアウト | 600s                                                    |
| 取得         | test pass/fail (stderr 付き)。Build 値は bootstrap から |

## Phase 1→2 Transition: Finding Deduplication

1. `file:line` で Codex と reviewer findings を重複除去 (category schema がソース間で異なるため、category は重複除去キーに含めない)
2. 衝突時: 最高 severity を保持、ソースタグはすべてリストで残す (例: `[codex, reviewer-security]`) 。追跡性のため
3. 重複除去済みセットを multi-source タグ付きで Phase 2 challenger と verifier に渡す

## Phase 2: Deep Assertion (Parallel)

3 つを並列起動。

| Task             | 実行者           | 入力                            |
| ---------------- | ---------------- | ------------------------------- |
| Adversarial test | Codex CLI (Bash) | worktree 内のスコープコード     |
| Challenger       | critic-audit     | Phase 1 の重複除去済み findings |
| Verifier         | critic-evidence  | Phase 1 の重複除去済み findings |

### 2a. Adversarial Testing (worktree 内で Codex exec)

Phase 0 の成功が前提。失敗時はスキップ。

```bash
codex exec -C <worktree-path> --full-auto "<adversarial-prompt>"
```

`<adversarial-prompt>`: ${CLAUDE_SKILL_DIR}/references/adversarial.md § Codex Prompt (スコープファイル一覧を埋める)。

| 制約         | 値   |
| ------------ | ---- |
| タイムアウト | 600s |

### 2b. Challenger + Verifier

| Task       | subagent_type   | 入力                            |
| ---------- | --------------- | ------------------------------- |
| Challenger | critic-audit    | Phase 1 の重複除去済み findings |
| Verifier   | critic-evidence | Phase 1 の重複除去済み findings |

各 120s タイムアウト。background Task。

## Phase 3: Intent Assertion

Phase 2a 戻り後、orchestrator (Claude Code) が adversarial test の失敗を逐次トリアージする。並列処理はなし。Phase 2 完了後に走る。

${CLAUDE_SKILL_DIR}/references/adversarial.md § Intent Assertion の判定ルール: assertion + 対象コード → intent source 検索 → 判定 (intent source が否定なら exclude、それ以外は promote)。

Intent source の優先順序: `.claude/OUTCOME.md` (Pre-flight でキャッシュした Behavior / Non-goals / Constraints) → `.claude/workspace/planning/` 配下の SOW / Spec → ADR → 対象ファイルの commit message → コードコメント。OUTCOME.md は「完了」の定義そのものなので最優先。Non-goal に踏み込む / Constraint に反する assertion は、テスト内容に関わらず promote する。

出力: promoted された adversarial findings のリスト (`[adversarial]` ソースタグ付き)。Phase 4 に渡す。

## Phase 4: Evidence Synthesis

`enhancer-evidence` を単一 background Task として起動。

| 入力                | ソース                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------- |
| Outcome reference   | `.claude/OUTCOME.md` の Behavior / Non-goals / Constraints (Pre-flight でキャッシュ済) |
| Challenger output   | Raw challenger 出力 (enhancer-evidence が内部で reconcile)                             |
| Verifier output     | Raw verifier 出力 (enhancer-evidence が内部で reconcile)                               |
| Outcome evidence    | Bootstrap smoke test (build) + Phase 1c (test) の結果                                  |
| Adversarial results | Phase 3 で promoted された findings (`[adversarial]` ソースタグ付きで issues に統合)   |

Integrator は単一の `issues` セットを構築する: `file:line` で重複除去、findings ごとにすべてのソースタグを保持 (例: `[challenger, adversarial]`)。Outcome reference に反する findings (Non-goal に踏み込む / Constraint を破る) は issues カウントで通常権重を持つ。統合セットが ${CLAUDE_SKILL_DIR}/references/gate-decision.md § Gate Rule のゲート判定を駆動する。

返り値: root causes + Gate decision (Ready / Ready (caveat) / NotReady) + report。

### Phase 4 Gate Decode (leader, deterministic)

enhancer-evidence は単一の fenced `json` decision ブロックを先頭に持つ Markdown レポートを返す。leader は gate を prose から読まない。ブロックを機械的に抽出・検証し、最終段で自然言語解釈が再混入しないようにする (/assert の JSON contract が塞ぐ経路そのもの)。

| Step | Action                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1    | enhancer の Task 出力から単一の `json` ブロックを切り出す                                                                          |
| 2    | decision フィールドを読む: `jq -r '.gate'`、`jq '.findings \| length'`、`jq -r '.build,.tests'`                                    |
| 3    | enum を検証: gate ∈ {Ready, NotReady}、build ∈ {pass,fail,skipped}、tests ∈ {pass,fail,skipped,no-runner}                          |
| 4    | クロスチェック: gate = Ready は findings length = 0 かつ build ≠ fail かつ tests ≠ fail を要する                                   |
| 5    | パース失敗・ブロック欠落・enum 違反・クロスチェック不一致のとき: enhancer を 1 度だけ再起動。2 度目の失敗 → NotReady に fail-close |

clean な decode 後の三値割り当て:

| Decoded gate | findings | Bootstrap         | Final gate     |
| ------------ | -------- | ----------------- | -------------- |
| NotReady     | any      | any               | NotReady       |
| Ready        | 0        | success           | Ready          |
| Ready        | 0        | env-failure (1-3) | Ready (caveat) |

````bash
# enhancer の Task 出力を "$OUT" に保存
BLOCK=$(awk '/^```json/{f=1;next} /^```/{f=0} f' "$OUT")
GATE=$(printf '%s' "$BLOCK" | jq -r '.gate')                 # malformed → jq が非ゼロ終了
ISSUES=$(printf '%s' "$BLOCK" | jq '.findings | length')
case "$GATE" in Ready|NotReady) ;; *) GATE=NotReady ;; esac  # enum ガード
[ "$GATE" = Ready ] && [ "$ISSUES" -ne 0 ] && GATE=NotReady   # クロスチェック
````

leader は decode した gate をそのまま中継し、prose から verdict を再生成しない。`Ready (caveat)` は bootstrap Step 1-3 が失敗 (env) し decode した findings = 0 のときのみ leader が付与する。

## Cleanup (Always)

すべての phase を try/finally で囲み、結果に関わらず cleanup を保証する。

```bash
git worktree remove <worktree-path> --force
git branch -D assert-<session-id>
```
