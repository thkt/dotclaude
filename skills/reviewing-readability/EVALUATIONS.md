# Evaluations for reviewing-readability

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: readability, 可読性, understandable, 理解しやすい, わかりやすい, clarity, 明確, naming, 命名, variable name, 変数名, function name, 関数名, nesting, ネスト, 深い, function design, 関数設計, comments, コメント, complexity, 複雑, confusing, 難しい, 難読, Miller's Law, ミラーの法則, cognitive load, 認知負荷, over-engineering, 過剰設計, unnecessary abstraction, 不要な抽象化
- **Contexts**: Code review, refactoring, naming decisions, complexity reduction

## Evaluation Scenarios

### Scenario 1: Miller's Law Violation Detection

```json
{
  "skills": ["reviewing-readability"],
  "query": "この関数の引数が多すぎる気がする。どうすべき？",
  "files": ["src/services/OrderService.ts"],
  "expected_behavior": [
    "Skill is triggered by '引数が多すぎる'",
    "References Miller's Law (7±2 cognitive limit)",
    "Identifies specific parameter count",
    "Suggests grouping into objects/types",
    "Provides concrete refactoring example"
  ]
}
```

### Scenario 2: Naming Improvement

```json
{
  "skills": ["reviewing-readability"],
  "query": "変数名や関数名の付け方をレビューしてほしい",
  "files": ["src/utils/helpers.ts"],
  "expected_behavior": [
    "Skill is triggered by '変数名' and '関数名'",
    "Applies 'Names That Can't Be Misconstrued' principle",
    "Identifies vague or ambiguous names",
    "Suggests specific, concrete alternatives",
    "Explains 'Specific > Generic' guideline"
  ]
}
```

### Scenario 3: Deep Nesting

```json
{
  "skills": ["reviewing-readability"],
  "query": "ifのネストが深くて読みにくい。どう直す？",
  "files": ["src/handlers/validation.ts"],
  "expected_behavior": [
    "Skill is triggered by 'ネスト' and '読みにくい'",
    "Recommends early return / guard clauses",
    "Shows before/after refactoring example",
    "Applies 'Make Control Flow Obvious' principle",
    "Reduces cognitive load"
  ]
}
```

### Scenario 4: AI Code Smell Detection

```json
{
  "skills": ["reviewing-readability"],
  "query": "AI生成コードが過剰に抽象化されている気がする",
  "files": ["src/services/UserService.ts"],
  "expected_behavior": [
    "Skill is triggered by 'AI' and '抽象化'",
    "Identifies premature abstraction patterns",
    "Detects unnecessary interfaces/classes",
    "Applies Occam's Razor",
    "Suggests simpler direct implementation"
  ]
}
```

### Scenario 5: Comprehensive Readability Review

```json
{
  "skills": ["reviewing-readability"],
  "query": "このコードの可読性をチェックして",
  "files": ["src/components/Dashboard.tsx"],
  "expected_behavior": [
    "Skill is triggered by '可読性'",
    "Applies 'The Art of Readable Code' principles",
    "Checks: naming, nesting, function size, comments",
    "Verifies Miller's Law compliance (7±2)",
    "Provides prioritized improvement suggestions"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by readability-related keywords
- [ ] Miller's Law (7±2) was referenced appropriately
- [ ] "Understanding time > writing time" principle applied
- [ ] Concrete refactoring examples were provided
- [ ] AI code smell patterns were detected when relevant
- [ ] New team member test: "< 1 minute to understand?"

## Baseline Comparison

### Without Skill

- Generic readability advice
- May miss Miller's Law limits
- No AI code smell detection
- Lacks systematic approach

### With Skill

- Scientific foundation (Miller's Law)
- Specific numeric limits (params ≤5, methods ≤7)
- AI-generated code analysis
- "Art of Readable Code" methodology
- Cognitive load measurement
