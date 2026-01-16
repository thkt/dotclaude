# 技術選定テンプレート

## 構造

```markdown
# {title}

- ステータス: {status}
- 決定者: {deciders}
- 日付: {date}

技術ストーリー: {technical_story_link}

## 背景と課題

{context}

## 決定要因

- {driver_1}
- {driver_2}
- {driver_3}

## 検討したオプション

- {option_1}
- {option_2}
- {option_3}

## 決定結果

採用オプション: "{chosen_option}"、理由: {rationale}

### 結果

#### ポジティブな結果

- {positive_1}
- {positive_2}
- {positive_3}

#### ネガティブな結果

- {negative_1}
- {negative_2}

## オプションの長所と短所

### {option_1}

{option_1_description}

- Good: {option_1_pro_1}
- Good: {option_1_pro_2}
- Bad: {option_1_con_1}
- Bad: {option_1_con_2}

### {option_2}

{option_2_description}

- Good: {option_2_pro_1}
- Good: {option_2_pro_2}
- Bad: {option_2_con_1}
- Bad: {option_2_con_2}

### {option_3}

{option_3_description}

- Good: {option_3_pro_1}
- Good: {option_3_pro_2}
- Bad: {option_3_con_1}
- Bad: {option_3_con_2}

## 追加情報

### 実装計画

{implementation_plan}

### 移行戦略

{migration_strategy}

### ロールバック計画

{rollback_plan}

## 検証

### 成功基準

- {success_criteria_1}
- {success_criteria_2}
- {success_criteria_3}

### メトリクス

- {metric_1}: {metric_1_target}
- {metric_2}: {metric_2_target}

## 関連ADR

<!-- update-index.sh により自動生成 -->

## 参考文献

<!-- collect-references.sh により自動収集 -->

---

_作成日: {date}_
_作成者: {author}_
_ADR番号: {number}_
```
