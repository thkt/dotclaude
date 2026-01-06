---
type: idr
version: 1.0.0
---

# IDR: [機能名]

## メタデータ

| Key          | Value              |
| ------------ | ------------------ |
| Version      | 1.0.0              |
| Feature      | [機能名]           |
| SOW          | [./sow.md or N/A]  |
| Created      | [YYYY-MM-DD HH:MM] |
| Last Updated | [YYYY-MM-DD HH:MM] |

---

## /code - [YYYY-MM-DD HH:MM]

### 変更ファイル

| File            | Change Type | Description |
| --------------- | ----------- | ----------- |
| path/to/file.ts | Created     | [概要]      |
| path/to/file.ts | Modified    | [概要]      |
| path/to/file.ts | Deleted     | [概要]      |

### 実装判断

| Decision   | Rationale | Alternatives Considered |
| ---------- | --------- | ----------------------- |
| [判断内容] | [根拠]    | [検討した代替案]        |

### 注意点

- [レビュアー向け注意点、エッジケース、落とし穴]

### 適用した原則

- [適用した原則: TDD, オッカムの剃刀, SOLID など]

### 信頼度: [C: 0.XX]

---

## /audit - [YYYY-MM-DD HH:MM]

### レビュー概要

| Severity | Count | Resolved |
| -------- | ----- | -------- |
| Critical | 0     | 0        |
| High     | 0     | 0        |
| Medium   | 0     | 0        |

### 問題点と対応

| #   | Issue    | Severity | File:Line    | Action         |
| --- | -------- | -------- | ------------ | -------------- |
| 1   | [問題点] | High     | src/xxx.ts:1 | Fixed/Deferred |

### 適用した推奨事項

- [適用した推奨事項]

---

## /polish - [YYYY-MM-DD HH:MM]

### 削除内容

| Item       | Type                | Reason |
| ---------- | ------------------- | ------ |
| [削除項目] | Comment/Code/Helper | [理由] |

### 簡素化内容

- [簡素化した内容と根拠]

---

## /validate - [YYYY-MM-DD HH:MM]

### SOW受け入れ基準検証

| AC ID  | Description | Status | Evidence   |
| ------ | ----------- | ------ | ---------- |
| AC-001 | [概要]      | PASS   | [検証内容] |
| AC-002 | [概要]      | FAIL   | [検証内容] |

### 特定されたギャップ

- [SOWとのギャップ]

### サインオフ

- Validator: AI
- Confidence: [C: 0.XX]
