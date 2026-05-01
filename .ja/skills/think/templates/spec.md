# Spec: [Feature Name]

Updated: [YYYY-MM-DD]
Session: [session-id]
SOW: [path to sow.md]

## Functional Requirements

| ID     | Description                | Input          | Output         | Implements | Testability Notes               |
| ------ | -------------------------- | -------------- | -------------- | ---------- | ------------------------------- |
| FR-001 | The system SHALL [action]. | [意味的な入力] | [意味的な出力] | AC-001     | [例: mock clock, pure fn, none] |

Input/Output: 何が入って何が出るかの意味的な記述。型名やフィールド名ではない。

Description: EARS (Easy Approach to Requirements Syntax) パターン必須。

| Pattern | Syntax                                                 | Use when                |
| ------- | ------------------------------------------------------ | ----------------------- |
| Always  | The system SHALL [action]                              | 無条件の振る舞い        |
| Event   | When [event], the system SHALL [action]                | トリガーへの応答        |
| State   | While [state], the system SHALL [action]               | ある条件の間            |
| Error   | If [condition], then the system SHALL [action]         | 失敗ハンドリング        |
| Limit   | The system SHALL NOT [action]                          | 禁止される振る舞い      |
| Complex | While [state], when [event], the system SHALL [action] | 状態 + トリガーの組合せ |

Rules: 1 文に 1 SHALL、具体的な値 ("appropriate" / "suitable" / "properly" / "correctly" は禁止)、各 SHALL は数値しきい値、名前付き状態 / エラー、または具体的な入出力ペアを指定する。

### Validation

| ID     | Description                                       | Error kind              |
| ------ | ------------------------------------------------- | ----------------------- |
| FR-002 | If [condition], then the system SHALL [response]. | [kind + 含めるべき情報] |

## Domain Model

<!-- 概念レベルのみ。型名、フィールド名、言語固有の構文は使わない。正確な型定義は Phase 1 の実装に属す。 -->

### Entities

| Entity   | Attributes     | Invariants           | FR     |
| -------- | -------------- | -------------------- | ------ |
| [Entity] | [意味的な属性] | [常に成立すべき条件] | FR-001 |

Attributes: 意味的な記述 ("authors のリスト", "thread origin (任意)")。フィールド名や型は実装判断。

<!-- Business Rules、Domain Events は該当する場合のみ追加 -->

### Business Rules

| ID     | Rule     | Description | Enforced By      | FR     |
| ------ | -------- | ----------- | ---------------- | ------ |
| BR-001 | [ルール] | [説明]      | [コンポーネント] | FR-001 |

### Domain Events

| Event      | Trigger    | Consumers        | FR     |
| ---------- | ---------- | ---------------- | ------ |
| [イベント] | [トリガー] | [コンシューマー] | FR-001 |

<!-- Implementation と Dependencies は任意。単一フェーズや外部依存なしなら省略 -->

## Implementation

| Phase | FRs    | Files      | Depends |
| ----- | ------ | ---------- | ------- |
| 1     | FR-001 | [ファイル] | none    |

Depends: この Phase が必要とする先行 Phase ID、または並列実行可能なら `none`。エージェントが独立 Phase を並行スケジュールできるようにする。

## Test Scenarios

| ID    | Type        | FR     | Given      | When   | Then   |
| ----- | ----------- | ------ | ---------- | ------ | ------ |
| T-001 | unit        | FR-001 | [前提条件] | [動作] | [結果] |
| T-002 | integration | FR-001 | [前提条件] | [動作] | [結果] |
| T-003 | e2e         | FR-001 | [前提条件] | [動作] | [結果] |

## Non-Functional Requirements

| ID      | Category    | Requirement | Target   | Rationale          | Validates |
| ------- | ----------- | ----------- | -------- | ------------------ | --------- |
| NFR-001 | performance | [要件]      | [目標値] | [なぜこの目標値か] | AC-001    |

Rationale: なぜこの目標値か (例: "UX ガイドライン", "SLA 99.9%", "親リクエストの P95 バジェット")。空ではレビュアーがしきい値が妥当か判断できない。

## Assumptions

| ID     | Assumption | Rationale        | Impact if broken       |
| ------ | ---------- | ---------------- | ---------------------- |
| AS-001 | [仮定]     | [なぜ成り立つか] | [崩れたら何が壊れるか] |

Assumption: 与件として置いた前提 (既存インフラ、データ形状、外部 SLA)。Impact if broken: 仮定が失敗したら再設計が必要なもの。レビュアーに隠れた結合を直視させる。

## Dependencies

| Type     | Name         | Purpose | Used By |
| -------- | ------------ | ------- | ------- |
| external | [ライブラリ] | [目的]  | FR-001  |

## Traceability Matrix

| AC     | FR     | Test  | NFR     |
| ------ | ------ | ----- | ------- |
| AC-001 | FR-001 | T-001 | NFR-001 |
