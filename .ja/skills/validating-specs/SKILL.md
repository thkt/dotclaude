---
name: validating-specs
description: >
  SOW/Spec のドキュメント間整合性検証。 トリガー: 整合性チェック, consistency
  check, spec validation, 仕様検証.
allowed-tools: [Read, Grep, Glob]
agent: sow-spec-reviewer
context: fork
user-invocable: false
---

# SOW/Spec 整合性検証

## ID体系

| ドキュメント | プレフィックス | リンク先         |
| ------------ | -------------- | ---------------- |
| SOW          | AC-N           | —                |
| Spec         | FR-NNN         | Implements: AC-N |
| Spec         | T-NNN          | FR: FR-NNN       |
| Spec         | NFR-NNN        | Validates: AC-N  |
| Spec         | AS-NNN         | —                |

優先度レベル（P0/P1/P2）とゲートルールは `formatting-audits` で定義。
各チェックは finding 種別ごとに優先度を割り当てる。

## チェック項目

P0発生可能なチェック（1-3）を先に実行。P0が発生した時点でゲートは NotReady
確定のため、下流チェックはスキップ可能。

### 1. AC→FR トレーサビリティ [P0候補]

各 `AC-N` に `Implements: AC-N` を持つ FR が1つ以上必要。

| Finding                                   | Priority |
| ----------------------------------------- | -------- |
| ACを実装するFRがない                      | P0       |
| 存在しないACを参照する孤立FR              | P1       |

### 2. FR→テストカバレッジ [P0候補]

各 `FR-NNN` に対応するFR参照を持つ `T-NNN` が1つ以上必要。

| Finding                               | Priority |
| ------------------------------------- | -------- |
| FRにテストシナリオがない              | P0       |
| テストが存在しないFRを参照            | P1       |

### 3. トレーサビリティマトリクス整合性 [P0候補]

| 列   | 存在必須箇所            |
| ---- | ----------------------- |
| AC   | SOW 受入基準            |
| FR   | Spec 機能要件テーブル   |
| Test | Spec テストシナリオ     |
| NFR  | Spec 非機能要件テーブル |

| Finding                                     | Priority |
| ------------------------------------------- | -------- |
| マトリクス行が存在しないIDを参照            | P0       |
| マトリクス行で期待される列が欠落            | P1       |

### 4. スコープ↔実装 [P1候補]

SOWのスコープ内ターゲットがSpecのフェーズに含まれること。余分なファイル → P2。

### 5. 矛盾検出 [P0/P1候補]

SOW↔Spec間の技術的不一致、数値の矛盾をクロスチェック。

| Finding                              | Priority |
| ------------------------------------ | -------- |
| SOWとSpecで矛盾する技術選定          | P0       |
| SOWとSpecで矛盾する数値              | P0       |
| 用語の不整合な使用                   | P1       |

### 6. 曖昧表現 [P0候補]

| 言語 | パターン                                                                           |
| ---- | ---------------------------------------------------------------------------------- |
| JA   | 適切に、できる限り、なるべく、ある程度、検討する、考慮する、予定、高速に(数値なし) |
| EN   | appropriately, as much as possible, reasonable, adequate, TBD, fast(no metric)     |

| Finding                                         | Priority |
| ----------------------------------------------- | -------- |
| SHALL句（FR）内の曖昧表現                       | P0       |
| NFR Target内の曖昧表現                          | P0       |
| それ以外の曖昧表現                              | P1       |

### 7. 用語の一貫性 [P1候補]

同じ概念に同じ用語を使用すること。

| Finding                                   | Priority |
| ----------------------------------------- | -------- |
| 同一役割での同義語混在（user/member）     | P1       |
| 略語の混在（DB/database）                 | P2       |

### 8. 列の完全性 [P0/P1/P2候補]

| Finding                                              | Priority |
| ---------------------------------------------------- | -------- |
| AC 観察可能シグナル列が空欄（SOW）                   | P0       |
| In Scope 観察可能な成果列が空欄（SOW）               | P1       |
| NFR Rationale 列が空欄                               | P1       |
| Assumption Impact-if-broken 列が空欄                 | P1       |
| Dependency Purpose 列が空欄                          | P2       |

Risks 列ルール（Probability/Mitigation × Impact）は
`sow-spec-reviewer` Risks 完全性セクションに委譲。

### 9. Phase 依存関係 [P1候補]

Implementation テーブルは `Depends` を記載必須。空欄だと並列スケジューリング
判断がブロックされる。

| Finding                                   | Priority |
| ----------------------------------------- | -------- |
| Phase Depends 列が空欄                    | P1       |

### 10. YAGNI 準拠 [P2]

YAGNIチェックリストあり: Specがチェック済み項目を除外していることを確認。
過剰設計をフラグ。

### 11. Scope 整合性 [P0/P1候補]

SOW の In Scope と Out of Scope は重複不可。AC は In Scope 対象のみを扱う。

| Finding                                           | Priority |
| ------------------------------------------------- | -------- |
| In Scope 対象が Out of Scope にも記載             | P0       |
| AC が In Scope に存在しない対象を参照             | P1       |
| Out of Scope に `Why not` 根拠なし                | P2       |

## 出力

レビュアー findings に追加される Markdown:

```markdown
## Consistency Findings

| ID      | Priority | Check      | Location                               | CC Impact                                | Fix                                    |
| ------- | -------- | ---------- | -------------------------------------- | ---------------------------------------- | -------------------------------------- |
| CON-001 | P0/P1/P2 | チェック名 | sow.md:セクション / spec.md:セクション | CCがこれを読んだ時に何をするか           | 具体的な書き換え例。「明確化」は禁止   |
```

Finding フォーマットおよびゲート寄与は `formatting-audits` 参照。
