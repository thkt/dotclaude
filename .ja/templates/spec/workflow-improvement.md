---
type: spec
version: 1.0.0
based_on: sow v1.0.0
updated: [YYYY-MM-DD]
confidence:
  overall: [0.0-1.0]
traceability:
  sow: [path]
  fr_count: [count]
  nfr_count: [count]
---

# Spec: [機能名]

## 1. 機能要件

| ID     | Description | Input  | Output | Confidence | Implements |
| ------ | ----------- | ------ | ------ | ---------- | ---------- |
| FR-001 | [要件]      | [入力] | [出力] | [C: 0.9]   | AC-001     |
| FR-002 | [要件]      | [入力] | [出力] | [C: 0.7]   | AC-002     |

### 検証ルール

| FR     | Rule   | Error              |
| ------ | ------ | ------------------ |
| FR-001 | [検証] | [エラーメッセージ] |

---

## 2. データモデル

```typescript
interface [ModelName] {
  [property]: [type];  // [FR-001]
}
```

### スキーママッピング

| Model   | Fields   | Used By        |
| ------- | -------- | -------------- |
| [Model] | [fields] | FR-001, FR-002 |

---

## 3. 実装

### フェーズマッピング

| Phase | FRs    | Files   | Confidence |
| ----- | ------ | ------- | ---------- |
| 1     | FR-001 | [files] | [C: X.X]   |
| 2     | FR-002 | [files] | [C: X.X]   |

### コマンド

| Phase | Command   | Purpose   |
| ----- | --------- | --------- |
| 1     | [command] | [purpose] |

---

## 4. テストシナリオ

| ID    | Type        | FR         | Given  | When   | Then   | Confidence |
| ----- | ----------- | ---------- | ------ | ------ | ------ | ---------- |
| T-001 | unit        | FR-001     | [前提] | [操作] | [結果] | [C: 0.9]   |
| T-002 | integration | FR-001,002 | [前提] | [操作] | [結果] | [C: 0.7]   |

---

## 5. 非機能要件

| ID      | Category        | Requirement | Target | Confidence | Validates |
| ------- | --------------- | ----------- | ------ | ---------- | --------- |
| NFR-001 | performance     | [要件]      | [目標] | [C: 0.7]   | AC-001    |
| NFR-002 | maintainability | [要件]      | [目標] | [C: 0.7]   | AC-002    |
| NFR-003 | compatibility   | [要件]      | [目標] | [C: 0.9]   | AC-003    |

---

## 6. 依存関係

| Type     | Name      | Purpose   | Used By |
| -------- | --------- | --------- | ------- |
| external | [lib]     | [purpose] | FR-001  |
| internal | [service] | [purpose] | FR-002  |

---

## 7. 前提条件と不明点

| ID     | Type       | Description | Confidence | Impact |
| ------ | ---------- | ----------- | ---------- | ------ |
| SA-001 | assumption | [前提]      | [C: 0.7]   | FR-001 |
| SA-002 | unknown    | [不明点]    | [C: 0.4]   | FR-002 |

---

## 8. 実装チェックリスト

| Phase | Task   | FR     | Status |
| ----- | ------ | ------ | ------ |
| 1     | [task] | FR-001 | [ ]    |
| 2     | [task] | FR-002 | [ ]    |

---

## 9. 移行ガイド

| Change | Before | After | Impact   |
| ------ | ------ | ----- | -------- |
| [機能] | [旧]   | [新]  | [互換性] |

---

## 10. トレーサビリティマトリクス

| SOW AC | Spec FR | Test  | NFR     |
| ------ | ------- | ----- | ------- |
| AC-001 | FR-001  | T-001 | NFR-001 |
| AC-002 | FR-002  | T-002 | NFR-002 |

---

## 11. IDR設定

| Key          | Value        | Rationale            |
| ------------ | ------------ | -------------------- |
| idr_required | [true/false] | [複雑さに基づく理由] |

### 自動判定基準

IDRが**必要**な場合（いずれかに該当）:

- SOWが存在する（追跡性が必要）
- 変更ファイル ≥ 3（複雑な変更）
- アーキテクチャ決定が含まれる
- 新しいパターンが導入される

IDRを**スキップ**する場合（すべてに該当）:

- SOWなし（アドホックタスク）
- 変更ファイル ≤ 2（単純な変更）
- アーキテクチャ決定なし
- 既存パターンのみを使用
