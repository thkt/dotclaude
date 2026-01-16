# アーキテクチャパターンテンプレート

## 構造

````markdown
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

- {positive_1} - 明確なアーキテクチャ
- {positive_2} - 保守性の向上
- {positive_3} - スケーラビリティの改善

#### ネガティブな結果

- {negative_1} - 学習コスト
- {negative_2} - 初期実装コスト

## オプションの長所と短所

### {option_1}

{option_1_description}

- Good: {option_1_pro_1}
- Good: {option_1_pro_2}
- Neutral: {option_1_neutral}
- Bad: {option_1_con_1}

### {option_2}

{option_2_description}

- Good: {option_2_pro_1}
- Good: {option_2_pro_2}
- Neutral: {option_2_neutral}
- Bad: {option_2_con_1}

### {option_3}

{option_3_description}

- Good: {option_3_pro_1}
- Good: {option_3_pro_2}
- Neutral: {option_3_neutral}
- Bad: {option_3_con_1}

## 追加情報

### アーキテクチャ図

```text
[アーキテクチャ図をここに挿入]
```

### 実装ガイドライン

1. {guideline_1}
2. {guideline_2}
3. {guideline_3}

### 品質属性

| 属性   | 優先度          | アプローチ    |
| ------ | --------------- | ------------- |
| {qa_1} | {qa_1_priority} | {qa_1_method} |
| {qa_2} | {qa_2_priority} | {qa_2_method} |

### 移行戦略

**フェーズ1**: {migration_phase_1}

**フェーズ2**: {migration_phase_2}

**フェーズ3**: {migration_phase_3}

### トレードオフ

このパターンでは以下をトレードオフします:

- {tradeoff_1}
- {tradeoff_2}

## 検証

### 成功基準

- {success_criteria_1}
- {success_criteria_2}
- {success_criteria_3}

### モニタリング

- {monitoring_1}
- {monitoring_2}

## 関連ADR

<!-- update-index.sh により自動生成 -->

## 参考文献

<!-- collect-references.sh により自動収集 -->

---

_作成日: {date}_
_作成者: {author}_
_ADR番号: {number}_
````
