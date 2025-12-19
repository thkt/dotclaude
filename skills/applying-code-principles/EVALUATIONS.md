# Evaluations for applying-code-principles

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: SOLID, DRY, Occam's Razor, KISS, Miller's Law, YAGNI, principle, 原則, simplicity, シンプル, complexity, 複雑, architecture, アーキテクチャ, refactor, リファクタリング, maintainability, 保守性, code quality, コード品質, design pattern, best practice, clean code
- **Contexts**: Code review, architectural decisions, refactoring planning, complexity evaluation

## Evaluation Scenarios

### Scenario 1: Basic Principle Application

```json
{
  "skills": ["applying-code-principles"],
  "query": "このクラスが大きくなりすぎた。どう整理すべき？",
  "files": ["src/services/UserService.ts"],
  "expected_behavior": [
    "Skill is triggered by 'クラス' and refactoring context",
    "Applies Single Responsibility Principle (SRP) analysis",
    "Identifies multiple responsibilities in the class",
    "Suggests concrete splitting strategy with rationale",
    "References Miller's Law for cognitive load concerns"
  ]
}
```

### Scenario 2: Principle Conflict Resolution

```json
{
  "skills": ["applying-code-principles"],
  "query": "DRYを適用してコードを共通化したいけど、読みやすさが下がりそう。どうすべき？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'DRY' and '読みやすさ'",
    "Acknowledges DRY vs Readability conflict",
    "Applies principle priority: Readable Code > DRY",
    "Explains when duplication is acceptable",
    "Provides concrete example of acceptable duplication"
  ]
}
```

### Scenario 3: YAGNI Decision

```json
{
  "skills": ["applying-code-principles"],
  "query": "将来の拡張性を考えてインターフェースを追加した方がいい？今は実装が1つだけ",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '拡張性' and 'インターフェース'",
    "Applies YAGNI principle immediately",
    "Advises against premature abstraction",
    "Explains 'add interface when 2nd implementation appears'",
    "References Occam's Razor for simplicity preference"
  ]
}
```

### Scenario 4: Code Review with Principles

```json
{
  "skills": ["applying-code-principles"],
  "query": "このコードをレビューして、設計原則の観点からフィードバックをください",
  "files": ["src/components/Dashboard.tsx"],
  "expected_behavior": [
    "Skill is triggered by 'レビュー' and '設計原則'",
    "Systematically checks against key principles",
    "Applies Quick Decision Questions framework",
    "Identifies specific violations with line references",
    "Provides actionable improvement suggestions"
  ]
}
```

### Scenario 5: Architecture Planning

```json
{
  "skills": ["applying-code-principles"],
  "query": "新機能の設計を考えている。アーキテクチャ的に気をつけることは？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '設計' and 'アーキテクチャ'",
    "Starts with Occam's Razor - simplest approach first",
    "Applies Progressive Enhancement mindset",
    "Warns against over-engineering (YAGNI)",
    "Suggests iterative approach: Make it Work → Resilient → Fast → Flexible"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by keywords/context
- [ ] Relevant principles were applied appropriately
- [ ] Principle priority was respected (Occam's Razor > YAGNI > ...)
- [ ] Concrete, actionable advice was provided
- [ ] Quick Decision Questions were referenced when appropriate
- [ ] No over-explanation of basic concepts (Claude already knows them)

## Baseline Comparison

### Without Skill

- Generic advice without structured principle application
- May miss principle conflicts
- Lacks Quick Decision Questions framework

### With Skill

- Systematic principle-based analysis
- Explicit conflict resolution with priority
- Actionable framework (Quick Decision Questions)
- Consistent terminology and approach
