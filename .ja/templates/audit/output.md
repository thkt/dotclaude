# Audit 出力テンプレート

/audit コマンドの出力テンプレート。

## テンプレート

```markdown
# 監査レポート

## 概要

| 重要度   | 件数                           | 差分             |
| -------- | ------------------------------ | ---------------- |
| Critical | {summary.by_severity.critical} | {delta.critical} |
| High     | {summary.by_severity.high}     | {delta.high}     |
| Medium   | {summary.by_severity.medium}   | {delta.medium}   |
| Low      | {summary.by_severity.low}      | {delta.low}      |

自動修正可能: {suggestions.auto_fixable_count} | 手動: {suggestions.manual_count}

---

## クイック修正

| ID                                       | 場所                                                                                                      | 工数                                         | 理由                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| {suggestions.items[fix_type!=manual].id} | `{suggestions.items[fix_type!=manual].location.file}:{suggestions.items[fix_type!=manual].location.line}` | {suggestions.items[fix_type!=manual].effort} | {suggestions.items[fix_type!=manual].rationale} |

適用: `/fix <ID>`

---

## パターン

| パターン          | 根本原因                |
| ----------------- | ----------------------- |
| {patterns[].name} | {patterns[].root_cause} |

---

## アクション

| 優先度       | アクション                              |
| ------------ | --------------------------------------- |
| [!] 即時対応 | {priorities[timing=immediate].action}   |
| [→] 今Sprint | {priorities[timing=this_sprint].action} |
```

## 差分表示形式

| 値  | 表示                           |
| --- | ------------------------------ |
| 0   | `-`                            |
| +N  | `+N` (Critical/Highは警告表示) |
| -N  | `-N`                           |

## 初回記録

以前のスナップショットが存在しない場合、すべての行の差分を `(初回)` と表示。
