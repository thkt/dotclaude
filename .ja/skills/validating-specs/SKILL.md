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

## チェック項目

CRITICAL（1-3）を先に実行。いずれか失敗した場合、残りも実行するが WARNING/INFO は暫定扱い。

### 1. AC→FR トレーサビリティ [CRITICAL]

各 `AC-N` に `Implements: AC-N`
を持つ FR が1つ以上必要。存在しない AC を参照する孤立 FR → INFO。

### 2. FR→テストカバレッジ [CRITICAL]

各 `FR-NNN` に対応する FR 参照を持つ `T-NNN` が1つ以上必要。

### 3. トレーサビリティマトリクスの整合性 [CRITICAL]

マトリクスの行が実際の内容と一致すること。不一致をフラグ。

| 列   | 存在必須箇所            |
| ---- | ----------------------- |
| AC   | SOW 受入基準            |
| FR   | Spec 機能要件テーブル   |
| Test | Spec テストシナリオ     |
| NFR  | Spec 非機能要件テーブル |

### 4. スコープ↔実装 [WARNING]

SOW のスコープ内ターゲットが Spec のフェーズに含まれること。余分なファイル →
INFO。

### 5. 矛盾検出 [WARNING]

SOW↔Spec 間の技術的不一致、数値の矛盾、記述の矛盾をクロスチェック。

### 6. 曖昧表現 [INFO]

| 言語 | パターン                                                                           |
| ---- | ---------------------------------------------------------------------------------- |
| JA   | 適切に、できる限り、なるべく、ある程度、検討する、考慮する、予定、高速に(数値なし) |
| EN   | appropriately, as much as possible, reasonable, adequate, TBD, fast(no metric)     |

### 7. 用語の一貫性 [WARNING]

同じ概念に同じ用語を使用すること。同義語（user/member）、略語の混在（DB/database）をフラグ。

### 8. YAGNI 準拠 [WARNING]

YAGNI チェックリストあり:
Spec がチェック済み項目を除外していることを確認。なし: 過剰設計をフラグ（過剰な権限、NFR なしのキャッシュ、スコープ外のインフラ）。

## 出力

レビューアーの findings に追加される YAML:

```yaml
consistency:
  - id: "CON-001"
    severity: CRITICAL|WARNING|INFO
    check: "<チェック名>"
    location: "sow.md:<セクション> / spec.md:<セクション>"
    issue: "<説明>"
    suggestion: "<修正案>"
```

## スコア影響

| 重大度   | 減点                                |
| -------- | ----------------------------------- |
| CRITICAL | 指摘1件につき -10（正確性から減点） |
| WARNING  | 指摘1件につき -5（完全性から減点）  |
| INFO     | 指摘1件につき -2（合計 -10 が上限） |
