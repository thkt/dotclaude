---
status: "accepted"
date: 2026-07-05
decision-makers: thkt
---

# ADR 0082: generator-e2e エージェントの廃止

## Context and Problem Statement

ADR-0029 (status: proposed) は Spec 駆動 E2E テスト生成のために `generator-e2e` エージェントを新設する決定を記録したが、その前提は現状成立していない。

- ADR-0029 は proposed のまま accepted に進まず、想定した統合が完了していない
- generator-e2e は spawn する caller が 0。/code, /feature を含む起動元が存在せず、docs のリスト記載のみで参照される孤立エージェント
- ADR-0029 が前提とした Spec 駆動基盤が現存しない。/spec スキルは無く、Spec も SOW も存在せず、`Type: e2e` シナリオを供給する入口が無い
- ADR-0029 が変更対象とした `skills/code/SKILL.md`, `skills/feature/SKILL.md`, `skills/e2e/SKILL.md`, `templates/spec/template.md` はいずれも現存しない (skill は workflow へ移行済み)

価値を検証しないまま孤立エージェントを残すか、廃止するか。

## Considered Options

- A: generator-e2e を維持し、ADR-0029 の統合を完遂する
- B: generator-e2e を廃止し、ADR-0029 を superseded にする

## Decision Outcome

選択: B。generator-e2e を廃止し、ADR-0029 を superseded とする。孤立したまま価値を検証できないエージェントを残す管理コストを、いつ来るとも知れない再統合の期待価値が上回らないため。

### Consequences

- Good, because 未検証の孤立エージェントが消え、agents ディレクトリと docs の記載が実態と一致する
- Good, because ADR-0029 が superseded になり、proposed のまま宙吊りだった決定の状態が確定する
- Bad, because 将来 Spec 駆動 E2E 生成を再び必要とする場合、agent 定義をゼロから起こす必要がある (ただし ADR-0029 が設計記録として残るため出発点はある)

### Confirmation

- `agents/generators/generator-e2e.md` と `.ja/` 対応ファイルが存在しないこと
- `.claude-plugin/marketplace.json` の agents 配列に generator-e2e を含まないこと
- `rg "generator-e2e" --glob '!docs/decisions/**'` が実体参照を返さないこと

## More Information

### Deprecation Target

`agents/generators/generator-e2e.md` および正本 `.ja/agents/generators/generator-e2e.md`。ADR-0029 (proposed) が定義した唯一の成果物。

### Migration Plan

移行不要。spawn caller が 0 のため、廃止による挙動変化を受ける呼び出し元が存在しない。docs (SKILLS_AGENTS.md の生成カテゴリ記載) と marketplace.json の登録を同時に除去済み。

### Rollback Plan

ADR-0029 が Approach B の設計判断 (agent-browser 依存を閉じ込める、Spec の `Type: e2e` を入力とする) を記録として保持する。再統合が必要になった時点で、まず /spec スキルと Spec テンプレートの `Type: e2e` 供給経路を復活させ、その後 agent 定義を再作成する。

### Reassessment Triggers

- Spec 駆動ワークフロー (/spec スキル + Spec テンプレート) が再導入され、`Type: e2e` シナリオの供給経路が復活したとき
- E2E テスト生成を自動パスへ組み込む具体的な実需が発生したとき

Supersedes ADR-0029.
