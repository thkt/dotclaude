---
name: polish
description: 軽量レビュー + クリーンアップ。任意で Codex + CodeRabbit + Gemini クロスチェック、slop 除去、テスト監査を行う。深い multi-reviewer 監査には使わない (/audit を使う)。
when_to_use: 整理して, きれいにして, コード整理, slop除去, ポリッシュ, テスト整理, テスト監査, クロスチェック, crosscheck, Codex レビュー, CodeRabbit, Gemini レビュー
allowed-tools: Bash(codex:*) Bash(coderabbit:*) Bash(gemini:*) Bash(git diff:*) Bash(git log:*) Bash(git stash:*) Bash(git status:*) Bash(cargo test:*) Bash(npm test:*) Bash(npm run test:*) Bash(bun test:*) Bash(pnpm test:*) Bash(yarn test:*) Bash(make test:*) Bash(which:*) Read Edit LS Skill Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target scope]"
---

# /polish - 軽量レビュー + クリーンアップ

並列レビュー (simplify + Codex + CodeRabbit + Gemini) → クリーンアップ (enhancer-code)。すべての修正は前面で直接適用する。

## 入力

- 対象スコープ: `$ARGUMENTS` (任意)
- `$ARGUMENTS` が空 → `git diff HEAD` (staged + unstaged) を分析

## 実行

### Phase 1: 並列レビュー

simplify, Codex, CodeRabbit, Gemini を並列実行する。各ツールは利用不可なら独立にスキップする。すべてスキップなら Phase 2 に進む。Gemini は別ファミリーレビューで Claude 生成コードの Self-Enhancement バイアスに対抗する。

| ツール     | フォーカス                                         | スキップ条件                                                |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------- |
| simplify   | 再利用、品質、効率                                 | (常に利用可能)                                              |
| Codex      | ロジック、アーキテクチャ、データフロー             | `which codex` 失敗                                          |
| CodeRabbit | セキュリティ、機械的バグ (P1)                      | `which coderabbit` 失敗または `coderabbit auth status` 失敗 |
| Gemini     | ロジック、保守性 (cross-family の懐疑的レビュアー) | `which gemini` 失敗                                         |

変更状態によりモードを選択。uncommitted と committed が両方ある場合は uncommitted モードを使う。

| 条件                            | モード      | Codex                        | CodeRabbit                                     | Gemini diff source     |
| ------------------------------- | ----------- | ---------------------------- | ---------------------------------------------- | ---------------------- |
| Uncommitted changes             | uncommitted | `codex review --uncommitted` | `coderabbit review --agent --type uncommitted` | `git diff HEAD`        |
| Commits vs base, no uncommitted | base        | `codex review --base main`   | `coderabbit review --agent --type committed`   | `git diff main...HEAD` |

Gemini コマンド。上記 source の diff を `$DIFF` に取得し、prompt にインライン埋め込みすることで Gemini に shell access を与えない。

```sh
gemini --skip-trust --approval-mode plan -m gemini-2.5-pro -p "$(cat <<EOF
この diff をレビューする。コードは Claude 生成の可能性があるので、Self-Enhancement バイアスに対抗するため懐疑的に見ること。
フォーカス: ロジック正しさ、アーキテクチャ、保守性。
スキップ: セキュリティ (CodeRabbit が担当)、コード再利用と AI slop (simplify と enhancer が担当)。
出力: [Critical|Major|Minor] file:line - 説明。Minor は捨てる。
<diff>
${DIFF}
</diff>
EOF
)"
```

注意点。`--skip-trust` は headless モードの trusted-folder チェックを回避する。`--approval-mode plan` は read-only を強制し、Gemini がファイル編集できない。`gemini-2.5-pro` は現行値。Gemini 3 が preview 卒業し、oauth-personal の capacity が安定したら切り替える。

Phase 1 のオーケストレーション手順。

| Step | 動作                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | モード検出: `git status --porcelain` → uncommitted または base                                                                                                                 |
| 2    | `Skill("simplify", args: "$ARGUMENTS")` で simplify を起動。同じレスポンスで Codex/CodeRabbit/Gemini CLI を並列実行                                                            |
| 3    | 4 タスクすべての findings を待つ                                                                                                                                               |
| 4    | file:line でツール間の findings を重複排除                                                                                                                                     |
| 5    | Triage: simplify は全部、Codex は P1/P2、CodeRabbit は critical のみ、Gemini は Critical+Major を残す。Phase 2 領域を捨てる。`git diff` スコープ外ファイルに触れる修正を捨てる |
| 6    | 残った findings を修正 (high 優先、次に medium)                                                                                                                                |
| 7    | テストコマンドを検出して検証。テスト失敗時は修正を `git stash`                                                                                                                 |

CodeRabbit の捨てる対象 (Phase 2 領域、ここでは適用しない): naming, formatting, readability, AI slop。フリープランの rate-limit を緩和するため `.coderabbit.yaml` で `profile: chill` を設定すべき。

### Phase 2: コードクリーンアップ

`Task(subagent_type: "enhancer-code")` で Phase 1 後の diff に対して `enhancer-code` エージェントを起動。エージェントは AI slop を除去し simplification ルールを適用、agent 内で定義された preservation rules を尊重しながらテストを監査する。

Phase 2 は Phase 1 のクリーンアップ後の構造を見るので、AI slop 検出は最終コード状態を反映し、修正前バイアスにならない。

## 出力

```text
Phase 1 (review):
  simplify: <summary>
  codex: <fixed N / skipped N with reasons / not available>
  coderabbit: <fixed N / skipped N with reasons / not available>
  gemini: <fixed N / skipped N with reasons / not available>
Phase 2 (cleanup):
  Code: <changes with file:line>
  Tests: <changes with file:line>
  Skipped: <files not audited, with reason>
```

## エラー処理

| エラー                      | 動作                                    |
| --------------------------- | --------------------------------------- |
| diff に変更なし             | "Nothing to polish" を報告              |
| simplify 失敗               | warning ログ、他ツールで続行            |
| codex 未インストール        | Codex のみスキップ、他は維持            |
| codex review 失敗           | warning ログして続行                    |
| coderabbit 未インストール   | CodeRabbit のみスキップ、他は維持       |
| coderabbit auth status 失敗 | CodeRabbit のみスキップ、他は維持       |
| coderabbit review 失敗      | warning ログして続行                    |
| gemini 未インストール       | Gemini のみスキップ、他は維持           |
| gemini capacity 枯渇        | Gemini のみスキップ、モデル名をログ     |
| gemini 呼び出し失敗         | warning ログして続行                    |
| Phase 1 の全ツールスキップ  | Phase 2 へ直接進む                      |
| 修正でテスト失敗            | 修正を `git stash`、findings をスキップ |
