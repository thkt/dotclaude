---
type: sow
version: 1.0.0
status: draft
created: [YYYY-MM-DD]
confidence:
  overall: [0.0-1.0]
  verified: [count]
  inferred: [count]
  uncertain: [count]
---

# SOW: [機能名]

## エグゼクティブサマリー

[C: 0.7] [1-2文の概要]

**スコープ**: [主要領域: area1, area2, area3]

---

## 問題分析

### 現状

| Metric | Value | Issue    | Confidence |
| ------ | ----- | -------- | ---------- |
| [指標] | [値]  | [問題点] | [C: X.X]   |

Evidence: [出典]

### 問題点

| ID    | Description | Confidence | Evidence              |
| ----- | ----------- | ---------- | --------------------- |
| I-001 | [問題点]    | [C: 0.9]   | [file:lineまたは出典] |
| I-002 | [問題点]    | [C: 0.7]   | [推論の根拠]          |
| I-003 | [問題点]    | [C: 0.5]   | [要調査]              |

---

## 前提条件

| ID    | Type       | Description    | Confidence |
| ----- | ---------- | -------------- | ---------- |
| A-001 | fact       | [検証済み事実] | [C: 0.95]  |
| A-002 | assumption | [作業前提]     | [C: 0.7]   |
| A-003 | unknown    | [要確認]       | [C: 0.4]   |

---

## ソリューション設計

### アプローチ

| Phase | Description      | Confidence |
| ----- | ---------------- | ---------- |
| 1     | [クイックウィン] | [C: X.X]   |
| 2     | [構造的改善]     | [C: X.X]   |
| 3     | [長期施策]       | [C: X.X]   |

### 代替案

| Option | Pros   | Cons   | Confidence | Decision  |
| ------ | ------ | ------ | ---------- | --------- |
| A      | [利点] | [欠点] | [C: X.X]   | **ADOPT** |
| B      | [利点] | [欠点] | [C: X.X]   | REJECT    |

---

## 受け入れ基準

| ID     | Description | Confidence | Validates    |
| ------ | ----------- | ---------- | ------------ |
| AC-001 | [基準]      | [C: 0.9]   | I-001        |
| AC-002 | [基準]      | [C: 0.7]   | I-002, A-002 |
| AC-003 | [基準]      | [C: 0.5]   | I-003        |

---

## テスト計画

| Priority | Type        | Description | Validates      |
| -------- | ----------- | ----------- | -------------- |
| HIGH     | unit        | [テスト]    | AC-001         |
| MEDIUM   | integration | [テスト]    | AC-001, AC-002 |
| LOW      | e2e         | [テスト]    | AC-003         |

---

## 実装計画

### 進捗マトリクス

| Feature | spec | design | impl | test | review | Progress |
| ------- | :--: | :----: | :--: | :--: | :----: | :------: |
| [機能]  |  ⬜  |   ⬜   |  ⬜  |  ⬜  |   ⬜   |    0%    |

Legend: ⬜=0% | 🔄=25% | 📝=50% | 👀=75% | ✅=100%

### フェーズ

| Phase | Steps          | Validates |
| ----- | -------------- | --------- |
| 1     | [step1, step2] | AC-001    |
| 2     | [step1, step2] | AC-002    |

---

## 成功指標

| Metric | Target   | Confidence | Validates |
| ------ | -------- | ---------- | --------- |
| [指標] | [目標値] | [C: X.X]   | AC-001    |

---

## リスク

| ID    | Risk     | Impact | Mitigation | Confidence |
| ----- | -------- | ------ | ---------- | ---------- |
| R-001 | [リスク] | HIGH   | [緩和策]   | [C: 0.9]   |
| R-002 | [リスク] | MEDIUM | [緩和策]   | [C: 0.7]   |
| R-003 | [リスク] | LOW    | [監視]     | [C: 0.5]   |

---

## 検証チェックリスト

| Check      | Status | Confidence |
| ---------- | ------ | ---------- |
| [前提条件] | [ ]    | [C: X.X]   |

---

## 参照

| Type     | Path   |
| -------- | ------ |
| research | [path] |
| related  | [path] |

---

## Implementation Records

IDR: `./idr.md`
Status: [ ] Not Started | [ ] In Progress | [ ] Complete

| Phase     | Date | Confidence |
| --------- | ---- | ---------- |
| /code     | -    | -          |
| /audit    | -    | -          |
| /polish   | -    | -          |
| /validate | -    | -          |
