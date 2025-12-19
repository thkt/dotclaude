# Evaluations Template for Skills

このテンプレートは、スキルの品質評価シナリオを作成するためのガイドです。

## 使用方法

1. このテンプレートをコピーして `[skill-name]/EVALUATIONS.md` として保存
2. `[skill-name]` を実際のスキル名に置換
3. 各シナリオのクエリと期待動作を具体化
4. 最低3つの評価シナリオを作成

---

# Evaluations for [skill-name]

## Selection Criteria

このスキルがトリガーされるべきキーワードとコンテキスト:

- Keywords: [トリガーキーワード（日本語/英語）]
- Contexts: [使用コンテキスト]

## Evaluation Scenarios (JSON Format - Anthropic公式Best Practices準拠)

### Scenario 1: Basic Usage

```json
{
  "skills": ["[skill-name]"],
  "query": "[typical user request in Japanese]",
  "files": [],
  "expected_behavior": [
    "Skill is triggered and loaded",
    "Correct reference files are accessed",
    "Output follows skill guidelines"
  ]
}
```

### Scenario 2: Edge Case

```json
{
  "skills": ["[skill-name]"],
  "query": "[edge case request]",
  "files": [],
  "expected_behavior": [
    "Handles edge case gracefully",
    "Provides appropriate fallback or guidance"
  ]
}
```

### Scenario 3: Error Handling

```json
{
  "skills": ["[skill-name]"],
  "query": "[problematic request]",
  "files": [],
  "expected_behavior": [
    "Provides clear error message",
    "Suggests alternatives or next steps"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] Expected behaviors were observed
- [ ] Output quality meets standards
- [ ] Response was in appropriate language (Japanese)
