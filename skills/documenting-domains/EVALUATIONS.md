# Evaluations for documenting-domains

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: domain understanding, glossary, entities, business logic, domain model, ER diagram, use cases, ドメイン理解, 用語集, エンティティ, ビジネスロジック, ドメインモデル, ER図, ユースケース
- **Contexts**: Domain documentation, business model analysis, /docs:domain command

## Evaluation Scenarios

### Scenario 1: Entity Extraction

```json
{
  "skills": ["documenting-domains"],
  "query": "このプロジェクトのエンティティ一覧をドキュメント化して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'エンティティ'",
    "Detects TypeScript interfaces/classes",
    "Detects Python dataclasses/Pydantic models",
    "Detects database models (Prisma, TypeORM)",
    "Lists entities with attributes"
  ]
}
```

### Scenario 2: Domain Glossary Generation

```json
{
  "skills": ["documenting-domains"],
  "query": "プロジェクトのドメイン用語集を作成したい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '用語集'",
    "Extracts terms from class/function names",
    "Parses CamelCase/snake_case into terms",
    "Includes descriptions from comments",
    "Generates alphabetically sorted glossary"
  ]
}
```

### Scenario 3: Entity Relationship Diagram

```json
{
  "skills": ["documenting-domains"],
  "query": "エンティティ間の関係をER図で表して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'ER図'",
    "Analyzes entity references",
    "Detects inheritance relationships",
    "Generates Mermaid ER diagram",
    "Shows cardinality (1:N, N:M)"
  ]
}
```

### Scenario 4: Business Logic Documentation

```json
{
  "skills": ["documenting-domains"],
  "query": "ビジネスロジックの概要をドキュメント化したい",
  "files": ["src/services/"],
  "expected_behavior": [
    "Skill is triggered by 'ビジネスロジック'",
    "Identifies service layer classes",
    "Extracts business rules from code",
    "Documents workflows and processes",
    "Links logic to entities"
  ]
}
```

### Scenario 5: Use Case Extraction

```json
{
  "skills": ["documenting-domains"],
  "query": "コードからユースケースを抽出して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'ユースケース'",
    "Identifies controller/handler methods",
    "Extracts user-facing operations",
    "Documents input/output for each use case",
    "Groups by domain area"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by domain keywords
- [ ] Entities were correctly extracted
- [ ] Domain terms were accurately parsed
- [ ] Relationships were correctly identified
- [ ] Mermaid ER diagrams were valid
- [ ] Business logic was documented meaningfully

## Baseline Comparison

### Without Skill

- Manual domain documentation
- May miss entities
- No relationship visualization
- Inconsistent glossary

### With Skill

- Automatic entity extraction
- Multi-framework support (TypeScript, Python, DB models)
- Mermaid ER diagram generation
- Automated glossary creation
- Concept relationship mapping
