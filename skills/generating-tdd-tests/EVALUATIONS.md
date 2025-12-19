# Evaluations for generating-tdd-tests

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: TDD, Test-Driven Development, テスト駆動開発, RGRC, Red-Green-Refactor, Baby Steps, test generation, テスト生成, test design, テスト設計, test cases, テストケース, equivalence partitioning, 同値分割, boundary value, 境界値分析, decision table, coverage, カバレッジ, unit test, ユニットテスト
- **Contexts**: Implementing features with /code, test planning, coverage strategy, refactoring with tests

## Evaluation Scenarios

### Scenario 1: RGRC Cycle Implementation

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "ユーザー登録機能をTDDで実装したい",
  "files": ["src/services/UserService.ts"],
  "expected_behavior": [
    "Skill is triggered by 'TDD' keyword",
    "Explains Red-Green-Refactor-Commit cycle",
    "Starts with simplest failing test (Baby Steps)",
    "Suggests 2-minute cycle approach from t_wada",
    "Provides concrete first test case to write"
  ]
}
```

### Scenario 2: Systematic Test Design

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "このバリデーション関数のテストケースを網羅的に考えたい",
  "files": ["src/utils/validators.ts"],
  "expected_behavior": [
    "Skill is triggered by 'テストケース' and '網羅'",
    "Applies equivalence partitioning technique",
    "Identifies boundary values systematically",
    "Creates decision table for complex conditions",
    "Produces structured test case list with rationale"
  ]
}
```

### Scenario 3: Baby Steps Approach

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "テストを書きながら少しずつ実装を進めたい。どう進めるべき？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'テスト' and '少しずつ'",
    "Explains Baby Steps philosophy (smallest possible change)",
    "Recommends 2-minute cycle target",
    "Shows progression: simple → complex test cases",
    "Warns against implementing too much at once"
  ]
}
```

### Scenario 4: SOW-Driven Test Generation

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "SOWの受け入れ基準からテストケースを生成したい",
  "files": [".claude/workspace/planning/sow.md"],
  "expected_behavior": [
    "Skill is triggered by 'SOW' and 'テストケース'",
    "Reads acceptance criteria from SOW",
    "Maps each criterion to test scenarios",
    "Applies systematic test design techniques",
    "Generates executable test structure"
  ]
}
```

### Scenario 5: Characterization Testing for Legacy Code

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "既存コードにテストを追加してからリファクタリングしたい",
  "files": ["src/legacy/OldModule.ts"],
  "expected_behavior": [
    "Skill is triggered by '既存コード' and 'リファクタリング'",
    "Explains characterization test concept",
    "Advises recording current behavior first",
    "Shows how to create safety net tests",
    "Links to TIDYINGS principle for safe refactoring"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by TDD-related keywords
- [ ] RGRC cycle was referenced appropriately
- [ ] Baby Steps approach was emphasized (2-min cycles)
- [ ] Systematic test design techniques were applied
- [ ] AAA (Arrange-Act-Assert) pattern was mentioned
- [ ] Concrete, runnable test examples were provided

## Baseline Comparison

### Without Skill

- Generic test advice without TDD methodology
- May miss systematic test design techniques
- Lacks Baby Steps discipline
- No SOW integration

### With Skill

- Structured RGRC cycle guidance
- Systematic test case generation (equivalence, boundary, decision table)
- Baby Steps discipline from t_wada methodology
- SOW → Test → Implementation flow
- Consistent AAA pattern in test examples
