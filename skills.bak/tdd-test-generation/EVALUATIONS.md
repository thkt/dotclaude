# Evaluations for tdd-test-generation

## Selection Criteria

このスキルがトリガーされるべきキーワードとコンテキスト:

- Keywords: TDD, テスト駆動, RGRC, テスト作成, ユニットテスト, Baby Steps, Red-Green-Refactor
- Contexts: Test-driven development, test creation, implementation with tests

## Evaluation Scenarios (JSON Format - Anthropic公式Best Practices準拠)

### Scenario 1: Basic TDD Cycle

```json
{
  "skills": ["tdd-test-generation"],
  "query": "TDDでユーザー認証機能を実装したい",
  "files": [],
  "expected_behavior": [
    "tdd-test-generation skillがトリガーされる",
    "Red-Green-Refactor-Commitサイクルが説明される",
    "最初に書くべきテストケースが提案される"
  ]
}
```

### Scenario 2: Test Case Generation

```json
{
  "skills": ["tdd-test-generation"],
  "query": "このバリデーション関数のテストケースを考えたい",
  "files": [],
  "expected_behavior": [
    "AAA (Arrange-Act-Assert) パターンが説明される",
    "境界値、エラーケース、正常ケースが網羅される",
    "具体的なテストコード例が提供される"
  ]
}
```

### Scenario 3: Refactoring with Tests

```json
{
  "skills": ["tdd-test-generation"],
  "query": "既存コードをリファクタリングする前にテストを追加したい",
  "files": [],
  "expected_behavior": [
    "特性テスト（Characterization Test）の概念が説明される",
    "現在の振る舞いを記録するテスト作成方法が示される",
    "安全なリファクタリングの進め方が提案される"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] TDD/RGRC cycle referenced
- [ ] Practical test examples provided
- [ ] Response was in Japanese
