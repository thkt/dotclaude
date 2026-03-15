# Audit 出力テンプレート

/auditコマンドの出力テンプレート。

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

自動修正可能: {suggestions.auto_fixable_count} | 手動:
{suggestions.manual_count} 検証: {summary.validation.verification.verified}
verified | {summary.validation.verification.weak_evidence} weak |
{summary.validation.verification.unverifiable} unverifiable

> **Pipeline**: {pipeline*health.domains_completed} | Skipped:
> {pipeline_health.domains_skipped} | Verification:
> {pipeline_health.verification_status}
> *(全ドメイン完了かつ検証が full の場合はこのセクションを省略)\_

---

## クイック修正

| ID                                    | 場所                                                                                                | 工数                                      | 理由                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| {suggestions.items[fix_type=auto].id} | `{suggestions.items[fix_type=auto].location.file}:{suggestions.items[fix_type=auto].location.line}` | {suggestions.items[fix_type=auto].effort} | {suggestions.items[fix_type=auto].rationale} |

適用: `/fix <ID>`

---

## 根本原因

| 根本原因                    | 解決される発見事項                                                   |
| --------------------------- | -------------------------------------------------------------------- |
| {root_causes[].description} | {root_causes[].findings_resolved} ({root_causes[].domains_involved}) |

---

## 要レビュー

> Challenger が棄却したが Verifier がエビデンスを確認。人間の判断が必要。

| 発見事項                    | 場所                      | Challenger の理由                     | Verifier のエビデンス              |
| --------------------------- | ------------------------- | ------------------------------------- | ---------------------------------- |
| {needs_review[].finding_id} | {needs_review[].location} | {needs_review[].challenger_reasoning} | {needs_review[].verifier_evidence} |

---

## アクション

| 優先度       | アクション                              |
| ------------ | --------------------------------------- |
| [!] 即時対応 | {priorities[timing=immediate].action}   |
| [→] 今Sprint | {priorities[timing=this_sprint].action} |

---

## 修正サイクル

1. 適用: `/fix SUG-XXX`（上記クイック修正）
2. 変更ファイルのみ再監査: `/audit <変更ファイル>`
3. 満足するまで繰り返す
```

## 差分表示形式

| 値  | 表示                           |
| --- | ------------------------------ |
| 0   | `-`                            |
| +N  | `+N` (Critical/Highは警告表示) |
| -N  | `-N`                           |

## 初回記録

以前のスナップショットが存在しない場合、すべての行の差分を `(初回)` と表示。
