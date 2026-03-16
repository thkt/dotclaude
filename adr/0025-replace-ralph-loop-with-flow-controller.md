# ADR-0025: gates を stateful completion gate に拡張

- Status: proposed
- Deciders: thkt
- Date: 2026-03-16

## Context and Problem Statement

3つの独立したStop hookが完了判定を担っている:

1. completion-gate.sh (bash): lint/type/test → failならblock
2. gates (Rust): knip/tsgo/madge → failならblock
3. ralph-loop (plugin): prompt再送 → completion-promiseまで繰り返し

問題:

- 3
  hookのchain順序競合リスク（特にralph-loopがstop_hook_active未チェック）
- completion-gate.shとgatesでgate実行基盤が重複
- ralph-loopは常に同じプロンプトを再送。phaseに応じた指示変更ができない
- Review Gateはスキル文書の指示頼み（loopが長くなると忘れる）

skill-loop (Zenn記事) のrouter的アプローチとsuperpowersのverification
skillから、gate結果 → phase判定 → phase固有プロンプト構築の着想を得た。

## Decision Drivers

- agent行動精度（phaseに応じた的確な指示）
- Stop hook間の競合排除（単一hook化）
- gate実行基盤の統合（bash重複排除）
- Review Gateの仕組みレベルでの強制
- state file最小化（transcriptが状態源）
- 既存ワークフロー（/code, /fix）との互換性

## Considered Options

### Option A: completion-gate + systemMessage（ralph-loop 温存）

- Good: 最小変更
- Bad: reasonを変えられない、2 hook同時block未定義

### Option B: bash flow-controller.sh + state file

- Good: prompt完全制御
- Bad: bashでstate管理、gatesとgate基盤が重複

### Option C: gates に統合 + state file

- Good: 単一Rustバイナリ、gate基盤統合
- Bad: state fileのフォーマット管理がgatesの責務外に漏れる

### Option D: gates に統合 + transcript ベース（state file 不要）

- Good: 単一バイナリ、state fileゼロ、transcriptが唯一の状態源
- Good: gatesがdiffとgate結果から自律的に判断
- Bad: transcriptフォーマット変更リスク（軽減可能）

## Decision Outcome

Option D: gatesに統合 + transcriptベース

### Rationale

1. gatesはすでに「完了を許可するか」を判断するcompletion
   gate。phase判定はその自然な拡張
2. state
   fileを作ると外部ツール（skill）がgatesの内部フォーマットを知る必要がある。transcriptならgatesが自分の前回出力を見るだけ
3. completion-gate.shのgateロジック（lint/type/test）はgatesのGateDefinitionに自然に統合できる
4. recall
   (Rust) にJSONLパーサーの実装パターンがあり、transcript読みのコストは低い
5. 単一バイナリで全gate + phase判定 = hook chainの競合がゼロ

### Phase Detection

```
gate fail                        → block + categorized failure
all pass + 前回 block ≠ all pass → block + review 指示
all pass + 前回 block = all pass → allow（review 済み）
transcript 読み失敗              → fail-open（gate 結果のみ）
```

## Consequences

### Positive

- 3 hook → 1 hook（chain競合ゼロ）
- bash gate → Rust gate（基盤統合、並列実行）
- Review Gateが仕組みレベルで強制される
- state file不要（transcriptが状態源）
- gatesが自律的に判断（skillはgatesの判断に介入しない）

### Negative

- transcriptフォーマット変更でphase判定が壊れる可能性（軽減: 自分の出力パターンのみ検索、フォーマット依存最小）
- gatesバイナリのサイズ・複雑度が増加
- ralph-loopからgatesへの移行が必要

### Neutral

- ralph-loopプラグインは無効化するが削除しない（ロールバック可能）
- superpowersの5-step verification gate, revert
  cycle, 禁止語をpromptテンプレートに組み込み

## Links

- SOW: ~/.claude/workspace/planning/2026-03-16-flow-controller/sow.md
- skill-loop: https://github.com/takumiyoshikawa/skill-loop
- superpowers: https://github.com/obra/superpowers
- recall parser: ~/GitHub/recall/src/parser/ (transcript JSONLパーサー)
- completion-gate spec:
  ~/.claude/workspace/planning/2026-03-10-completion-gate/spec.md
