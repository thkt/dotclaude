# Evaluations for code-principles

## Selection Criteria

このスキルがトリガーされるべきキーワードとコンテキスト:

- Keywords: SOLID, DRY, YAGNI, Occam's Razor, KISS, 原則, シンプル, 設計, アーキテクチャ, リファクタリング
- Contexts: Architecture discussion, code review, refactoring, design decisions

## Evaluation Scenarios (JSON Format - Anthropic公式Best Practices準拠)

### Scenario 1: Basic Principle Application

```json
{
  "skills": ["code-principles"],
  "query": "このコードをリファクタリングしたい",
  "files": [],
  "expected_behavior": [
    "code-principles skillがトリガーされる",
    "SOLID原則が参照される",
    "具体的な改善提案が出力される"
  ]
}
```

### Scenario 2: Decision Making

```json
{
  "skills": ["code-principles"],
  "query": "これを抽象化すべきか？",
  "files": [],
  "expected_behavior": [
    "YAGNI/Occam's Razorが参照される",
    "「今必要か？」の判断基準が提示される",
    "具体的な判断が示される"
  ]
}
```

### Scenario 3: Conflict Resolution

```json
{
  "skills": ["code-principles"],
  "query": "DRYとReadabilityが競合している",
  "files": [],
  "expected_behavior": [
    "原則の優先順位が説明される",
    "コンテキストに応じた判断が示される",
    "具体的なコード例が提供される"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] Appropriate principles referenced
- [ ] Output quality meets standards
- [ ] Response was in Japanese
