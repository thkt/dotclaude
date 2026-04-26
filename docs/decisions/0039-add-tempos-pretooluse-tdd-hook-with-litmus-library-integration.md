---
status: "proposed"
date: 2026-04-13
---

# ADR-0039: PreToolUse hook に tempos を追加し litmus library 統合で TDD リズムを強制する

- Context: tempos SOW/Spec (workspace/planning/2026-04-13-tempos/)

---

## Context and Problem Statement

Claude CodeはCLAUDE.mdのTDDルールをコンテキスト膨張時に逸脱する。テストなし実装・over-implementation・テスト複数追加が発生し、人間が検出するまで気づかない。

tdd-guard（OSS）は全判定をClaude APIに投げるためEditのたびに3-8sのレイテンシが発生する。hook pipeline（shields / guardrails / formatter / reviews / gates）は全てRust製ローカル完結であり、TDD強制もこのパターンに乗せたい。

## Decision Drivers

- PreToolUseホットパスのレイテンシ < 500msが必須
- litmusがpub library APIを公開済み。gatesが `litmus = { git }` で利用中
- sentinels pluginパターンが確立済みで配布コストが低い
- TDDのリズムは段階的に検証可能（安い順にfast-fail）

## Considered Options

### A. Monolithic binary + litmus library integration

litmusをlibrary dependencyとして直接統合。4層ローカル判定（分類→テスト数→品質→Red Phase）。

- Good: litmus oxcパーサーがインプロセスで動き、レイテンシ最小
- Good: gatesの前例があり統合パターン確立済み
- Bad: litmusのoxcバージョンロック（gates / litmus / temposで共有）
- Bad: Rustテスト品質はlitmus Rust対応待ち

### B. Orchestrator + subprocess calls

litmus / tree-sitter等を外部コマンドとして呼び出し。

- Good: コンポーネント独立でバージョンロック回避
- Bad: subprocess起動コストで500ms予算超過リスク
- Bad: litmusはCLI入出力が未整備

### C. tdd-guard をそのまま使用

- Good: 実装コストゼロ
- Bad: 全判定Claude API経由で3-8sレイテンシ
- Bad: API障害時にhookが不安定
- Bad: 既存pipelineパターン（Rust + homebrew-tap）と不一致

## Decision Outcome

Approach Aを採用。PreToolUse 500ms以内が最重要制約であり、litmusインプロセス実行で達成できる。Layer 5（Claude SDK over-implementation検出）はPhase 2でPostToolUse advisoryに分離（DA Finding: PreToolUseに3-8s APIコールは不適）。

### Positive Consequences

- TDD逸脱がedit時点でblock、人間の検出コストゼロ
- レイテンシ < 500ms（tdd-guard比85%+ 削減）
- 既存パイプラインと同一配布パターン

### Negative Consequences

- litmus oxcバージョンをgates / temposで合わせる必要あり
- Rustテスト品質ルールはlitmus Rust対応待ち
- test.json freshness（300秒閾値）は運用データで要調整

## Rollback Plan

新規バイナリのため、sentinels pluginエントリ削除でpipelineから即除外可能。

## Success Criteria

- Layer 1-4 combined latency < 500ms (TS), < 200ms (Rust)
- テストなし実装editがRed Phase checkでblockされる
- tautological testがlitmus quality checkでblockされる

## Reassessment Triggers

- litmusがRustテスト品質ルールに対応した場合
- tdd-guardがローカル判定に移行した場合
- PostToolUse advisory（Layer 5）の優先度が上がった場合
