---
name: polish
description: 軽量の adversarial probe + クリーンアップ。Codex + CodeRabbit + Antigravity の findings は critic-audit が challenge し、事実として集約しない。深い multi-reviewer 監査には使わない (/audit を使う)。
when_to_use: 整理して, きれいにして, コード整理, slop除去, ポリッシュ, テスト整理, テスト監査, クロスチェック, crosscheck, Codex レビュー, CodeRabbit, Gemini レビュー
allowed-tools: Bash(codex:*) Bash(coderabbit:*) Bash(agy:*) Bash(git diff:*) Bash(git log:*) Bash(git stash:*) Bash(git status:*) Bash(cargo test:*) Bash(npm test:*) Bash(npm run test:*) Bash(bun test:*) Bash(pnpm test:*) Bash(yarn test:*) Bash(make test:*) Bash(which:*) Read Edit LS Skill Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target scope]"
---

# /polish - 軽量レビュー + クリーンアップ

並列レビュー (code-review + Codex + CodeRabbit + Antigravity) → critic-audit による adversarial challenge → クリーンアップ (simplify + enhancer-code)。すべての修正は前面で直接適用する。

Phase 1 のレビュアーは互いの findings を見ずに並列実行する。出力の集約は和であって議論ではない。Phase 1.5 は集約済みの findings 全体に対して `critic-audit` を 1 回 spawn し、単一の懐疑的な読み手が各 finding を実コードと突き合わせて判定、文脈を外した指摘を降格または棄却し、検証済みの項目だけを Phase 2 に通す。

## 入力

- 対象スコープ: `$ARGUMENTS` (任意)
- `$ARGUMENTS` が空 → `git diff HEAD` (staged + unstaged) を分析

## 実行

### Phase 1: 並列レビュー + adversarial challenge

code-review (high effort), Codex, CodeRabbit, Antigravity を並列実行する。各ツールは利用不可なら独立にスキップする。すべてスキップなら Phase 2 に進む。Antigravity (Gemini ベース) は別ファミリーレビューで Claude 生成コードの Self-Enhancement バイアスに対抗する。

code-review の effort 選択理由。critic-audit (Phase 1.5) が false positive を絞り込むため、上流は `high` で幅広く findings を出す。low/default では見落とすバグの検出率が上がり、ノイズは下流で除去される。

| ツール      | フォーカス                                         | スキップ条件                                                |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------- |
| code-review | 再利用、品質、効率 (high effort)                   | (常に利用可能)                                              |
| Codex       | ロジック、アーキテクチャ、データフロー             | `which codex` 失敗                                          |
| CodeRabbit  | セキュリティ、機械的バグ (P1)                      | `which coderabbit` 失敗または `coderabbit auth status` 失敗 |
| Antigravity | ロジック、保守性 (cross-family の懐疑的レビュアー) | `which agy` 失敗                                            |

変更状態によりモードを選択。uncommitted と committed が両方ある場合は uncommitted モードを使う。

| 条件                            | モード      | Codex                        | CodeRabbit                                     | Antigravity diff source |
| ------------------------------- | ----------- | ---------------------------- | ---------------------------------------------- | ----------------------- |
| Uncommitted changes             | uncommitted | `codex review --uncommitted` | `coderabbit review --agent --type uncommitted` | `git diff HEAD`         |
| Commits vs base, no uncommitted | base        | `codex review --base main`   | `coderabbit review --agent --type committed`   | `git diff main...HEAD`  |

Antigravity コマンド。上記 source の diff を `$DIFF` に取得し、prompt にインライン埋め込みすることで Antigravity に shell access を与えない。

```sh
OUT="$(agy -p --print-timeout 4m "$(cat <<EOF
Review this diff. The code may be Claude-generated, so be skeptical to counter Self-Enhancement bias.
Focus: Logic correctness, Architecture, Maintainability.
Skip: Security (covered by CodeRabbit), Code reuse and AI slop (covered by code-review and enhancer).
Output per finding: [Critical|Major|Minor] file:line - description. Drop Minor.
<diff>
${DIFF}
</diff>
EOF
)")"

# Capacity detection. On quota exhaustion agy prints nothing and still exits 0
# (or stalls until --print-timeout), so empty stdout must NOT be read as
# "reviewed, no findings"; doing so silently drops the cross-family skeptic.
if [ -n "${OUT//[[:space:]]/}" ]; then
  printf '%s\n' "$OUT"          # findings → Phase 1 aggregation
elif ugrep -q 'RESOURCE_EXHAUSTED' ~/.gemini/antigravity-cli/cli.log 2>/dev/null; then
  RESET="$(ugrep -o 'Resets in [0-9hms]*' ~/.gemini/antigravity-cli/cli.log | tail -1)"
  echo "antigravity: skipped (quota exhausted${RESET:+, $RESET})"
else
  echo "antigravity: skipped (no output)"
fi
```

注意点。`agy -p` は単一 prompt を非対話で実行する (Antigravity CLI、Gemini ベース)。read-only は構造的に担保。prompt は inline diff で自己完結し、`--add-dir` で workspace を与えず、`--dangerously-skip-permissions` を付けないので編集が auto-approve されない (`--print` モードでは許可プロンプト自体が出ない)。モデルと rate limit は Antigravity が管理し、フラグで選択できない。

capacity 検出の理由。quota 枯渇は非ゼロ exit や stderr として現れない。agy は exit 0 のまま空の stdout を出し、時には stall する。`--print-timeout 4m` が stall を抑える (agy デフォルトは 5m)。したがって空の stdout を「レビュー済み、findings なし」とは決して数えない。上のブロックはそれを `skipped` に分類し、`~/.gemini/antigravity-cli/cli.log` (デフォルトの app-data ログパス。カスタム `.gemini` dir 設定時は異なる) から resets-in の時間を読み取る。これにより cross-family の懐疑的レビュアーは黙って消えるのでなく、欠けたものとして報告される。

CodeRabbit の捨てる対象 (Phase 2 領域、ここでは適用しない): naming, formatting, readability, AI slop。フリープランの rate-limit を緩和するため `.coderabbit.yaml` で `profile: chill` を設定すべき。

Phase 1 のオーケストレーション手順。

| Step | 動作                                                                                                                                                                                                                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | モード検出: `git status --porcelain` → uncommitted または base                                                                                                                                                                                                                                                                                      |
| 2    | `Skill("code-review", args: "high")` で code-review を起動。同じレスポンスで Codex/CodeRabbit/Antigravity CLI を並列実行                                                                                                                                                                                                                            |
| 3    | 4 タスクすべての findings を待つ                                                                                                                                                                                                                                                                                                                    |
| 4    | file:line でツール間の findings を重複排除                                                                                                                                                                                                                                                                                                          |
| 5    | Adversarial challenge。集約済みの各 finding を critic-audit の入力スキーマにマップする (`~/.claude/agents/critics/critic-audit.md` の Input セクション参照)。全リストを渡して `Task(subagent_type: "critic-audit")` を 1 回 spawn。finding ごとの verdict を待つ: confirmed / disputed / downgraded / needs_context                                 |
| 6    | Triage。まず critic-audit の verdict を適用: `disputed` は捨て、`downgraded` は severity を下げ、`needs_context` は 1 行サマリ付きでユーザーに提示。生き残りに対して code-review は全部、Codex は P1/P2、CodeRabbit は critical のみ、Antigravity は Critical+Major を残す。Phase 2 領域を捨てる。`git diff` スコープ外ファイルに触れる修正を捨てる |
| 7    | 残った findings を修正 (high 優先、次に medium)                                                                                                                                                                                                                                                                                                     |
| 8    | テストコマンドを検出して検証。テスト失敗時は修正を `git stash`                                                                                                                                                                                                                                                                                      |

### Phase 2: コードクリーンアップ

2 つのクリーンアップ mutator が Phase 1 後の diff に対して順番に実行され、その後テストで検証する。どちらもクリーンアップ専用で修正を直接適用するため、設計上 critic-audit を経由しない。これは Phase 2 が enhancer-code に既に与えている信頼モデルと同じ。どちらもバグ探しはしないので、Phase 1.5 の challenge を逃れる finding は生まれない。

enhancer-code を最後に実行することで、その preservation rules (迷ったら残す) が simplify の編集に対して最終決定権を持つ。post-2a の構造を見るので、AI slop 検出は最終コード状態を反映し、修正前バイアスにならない。

`simplify` は Phase 1 の code-review 呼び出しと同様、デフォルトで現在の diff を対象にする。引数なしの起動を拒否された場合は、Phase 1 で検出したのと同じ diff スコープを渡す。

| Step | 動作                                                                                                                              | カバー範囲                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 2a   | 現在の diff に対して `Skill("simplify")`。クリーンアップ専用レビュー (再利用、簡素化、効率、抽象度) で修正を直接適用              | 抽象度 (altitude)。Phase 1 の findings-only code-review が見ないクリーンアップ次元 |
| 2b   | `Task(subagent_type: "enhancer-code")` で `enhancer-code` を spawn。AI slop を除去し、simplification ルールを適用し、テストを監査 | AI slop、テスト監査、preservation で保護された簡素化                               |
| 2c   | テストコマンドを検出して検証。失敗時はクリーンアップ編集を `git stash`                                                            | 両 mutator の regression guard                                                     |

## 出力

```text
Phase 1 (review):
  code-review: <summary>
  codex: <fixed N / skipped N with reasons / not available>
  coderabbit: <fixed N / skipped N with reasons / not available>
  antigravity: <fixed N / skipped N with reasons / not available>
Phase 1.5 (critic-audit challenge):
  total: N / confirmed: N / disputed: N / downgraded: N / needs_context: N
Phase 2 (cleanup):
  simplify: <changes with file:line / not available>
  enhancer-code:
    Code: <changes with file:line>
    Tests: <changes with file:line>
    Skipped: <files not audited, with reason>
  validation: <test command + pass/fail>
```

## エラー処理

| エラー                                             | 動作                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| diff に変更なし                                    | "Nothing to polish" を報告                                                           |
| code-review 失敗                                   | warning ログ、他ツールで続行                                                         |
| codex 未インストール                               | Codex のみスキップ、他は維持                                                         |
| codex review 失敗                                  | warning ログして続行                                                                 |
| coderabbit 未インストール                          | CodeRabbit のみスキップ、他は維持                                                    |
| coderabbit auth status 失敗                        | CodeRabbit のみスキップ、他は維持                                                    |
| coderabbit review 失敗                             | warning ログして続行                                                                 |
| agy 未インストール                                 | Antigravity のみスキップ、他は維持                                                   |
| agy の stdout 空 + cli.log に `RESOURCE_EXHAUSTED` | `antigravity: skipped (quota exhausted, <resets in>)` を報告。レビュー済みと数えない |
| agy の stdout 空、quota マーカーなし               | `antigravity: skipped (no output)` を報告。レビュー済みと数えない                    |
| agy 呼び出し失敗                                   | warning ログして続行                                                                 |
| critic-audit が空を返す                            | warning ログ、集約 findings をそのまま維持して Triage に進む                         |
| critic-audit 失敗                                  | warning ログ、集約 findings をそのまま維持して Triage に進む                         |
| Phase 1 の全ツールスキップ                         | Phase 2 へ直接進む                                                                   |
| 修正でテスト失敗                                   | 修正を `git stash`、finding をスキップ                                               |
| simplify 利用不可                                  | step 2a をスキップ、enhancer-code に進む                                             |
| simplify 失敗                                      | warning ログ、enhancer-code に進む                                                   |
| クリーンアップでテスト失敗                         | クリーンアップ編集 (2a + 2b) を `git stash`、失敗した step を報告                    |
