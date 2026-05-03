---
name: use-workflow-spec-validation
description: SOW/Spec のドキュメント横断整合性検証。
when_to_use: 整合性チェック, consistency check, spec validation, 仕様検証
allowed-tools: Read Bash(ugrep:*) Bash(bfs:*)
agent: reviewer-spec
context: fork
user-invocable: false
---

# Workflow: SOW/Spec Validation

## ID 体系

| ドキュメント | プレフィックス | リンク先         |
| ------------ | -------------- | ---------------- |
| SOW          | AC-N           | -                |
| Spec         | FR-NNN         | Implements: AC-N |
| Spec         | T-NNN          | FR: FR-NNN       |
| Spec         | NFR-NNN        | Validates: AC-N  |
| Spec         | AS-NNN         | -                |

優先度 (P0/P1/P2) と Gate ルールは `reviewer-spec` エージェントで定義する。
以下の各チェックは発見事項の種別ごとに優先度を割り当てる。

## チェック

P0 を生むチェック (1-3) を最初に実行する。P0 が 1 件でも上がれば、後続のチェックはスキップしてよい。その時点で gate は NotReady になる。

### 1. AC→FR 追跡性 [P0 候補]

各 `AC-N` に `Implements: AC-N` を持つ FR が 1 件以上必要。

| 発見事項                            | 優先度 |
| ----------------------------------- | ------ |
| AC を実装する FR が存在しない       | P0     |
| 存在しない AC を実装する孤立した FR | P1     |

### 2. FR→Test カバレッジ [P0 候補]

各 `FR-NNN` に対して、対応する FR を参照する `T-NNN` が 1 件以上必要。

| 発見事項                    | 優先度 |
| --------------------------- | ------ |
| FR にテストシナリオがない   | P0     |
| Test が存在しない FR を参照 | P1     |

### 3. 追跡性マトリクスの整合性 [P0 候補]

| 列   | 存在すべき場所            |
| ---- | ------------------------- |
| AC   | SOW Acceptance Criteria   |
| FR   | Spec Functional Req table |
| Test | Spec Test Scenarios       |
| NFR  | Spec NFR table            |

| 発見事項                             | 優先度 |
| ------------------------------------ | ------ |
| マトリクスの行が存在しない ID を参照 | P0     |
| マトリクスの行に必要な列が欠落       | P1     |

### 4. Scope↔Implementation [P1 候補]

SOW の In-Scope ターゲットは Spec のフェーズに登場すること。余分なファイル → P2。

### 5. 矛盾検出 [P0/P1 候補]

SOW↔Spec 間で技術不一致や数値の競合をクロスチェックする。

| 発見事項                     | 優先度 |
| ---------------------------- | ------ |
| SOW と Spec で技術が矛盾     | P0     |
| SOW と Spec で数値が矛盾     | P0     |
| 用語が一貫せずに使われている | P1     |

### 6. 曖昧な表現 [P0 候補]

| 言語 | パターン                                                                           |
| ---- | ---------------------------------------------------------------------------------- |
| JA   | 適切に、できる限り、なるべく、ある程度、検討する、考慮する、予定、高速に(数値なし) |
| EN   | appropriately, as much as possible, reasonable, adequate, TBD, fast(no metric)     |

| 発見事項                 | 優先度 |
| ------------------------ | ------ |
| SHALL 句 (FR) 内の曖昧語 | P0     |
| NFR Target 内の曖昧語    | P0     |
| その他箇所の曖昧語       | P1     |

### 7. 用語の一貫性 [P1 候補]

同じ概念には同じ用語を全ドキュメントで使うこと。

| 発見事項                                   | 優先度 |
| ------------------------------------------ | ------ |
| 同じロールに対する同義語混在 (user/member) | P1     |
| 略語の混在 (DB/database)                   | P2     |

### 8. 列の完全性 [P0/P1/P2 候補]

| 発見事項                                    | 優先度 |
| ------------------------------------------- | ------ |
| AC の Observable signal 列が空 (SOW)        | P0     |
| In Scope の Observable outcome 列が空 (SOW) | P1     |
| NFR Rationale 列が空                        | P1     |
| Assumption Impact-if-broken 列が空          | P1     |
| Dependency Purpose 列が空                   | P2     |

Risks 列のルール (Probability/Mitigation × Impact) は `reviewer-spec` の Risks Completeness セクションに委任する。

### 9. フェーズ依存 [P1 候補]

実装テーブルは `Depends` を宣言すること。Depends が空だと並列スケジュールの判断ができない。

| 発見事項                  | 優先度 |
| ------------------------- | ------ |
| フェーズの Depends 列が空 | P1     |

### 10. YAGNI 準拠 [P2]

YAGNI Checklist を用い、Spec がチェックされた項目を除外していることを確認する。Over-engineering を flag する。

### 11. Scope の整合性 [P0/P1 候補]

SOW の In Scope と Out of Scope は重複しないこと。AC は In Scope のみを対象にすること。

| 発見事項                                    | 優先度 |
| ------------------------------------------- | ------ |
| In Scope ターゲットが Out of Scope にも記載 | P0     |
| AC が In Scope に無いターゲットを参照       | P1     |
| Out of Scope に `Why not` の正当化がない    | P2     |

## 出力

reviewer の発見事項に追記する Markdown。

```markdown
## Consistency Findings

| ID      | Priority | Check      | Location                         | CC Impact                        | Fix                                  |
| ------- | -------- | ---------- | -------------------------------- | -------------------------------- | ------------------------------------ |
| CON-001 | P0/P1/P2 | check name | sow.md:section / spec.md:section | この記述を読んだとき CC が何をするか | "明確化せよ" ではなく具体的な書き換え |
```

発見事項のフォーマットと Gate への寄与は `reviewer-spec` エージェントに従う。
