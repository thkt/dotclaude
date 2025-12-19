# Evaluations for creating-adrs

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: ADR, Architecture Decision, 決定記録, 技術選定, アーキテクチャ決定, design decision, 技術的決定, 設計判断, create ADR, document decision, 非推奨化, deprecation, プロセス変更, process change
- **Contexts**: Architecture decisions, technology selection, design documentation, /adr command

## Evaluation Scenarios

### Scenario 1: Technology Selection ADR

```json
{
  "skills": ["creating-adrs"],
  "query": "Reactを採用する決定をADRとして記録したい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'ADR' and '決定'",
    "Provides MADR format template",
    "Executes 6-phase process (pre-check → template → references → proofread → index → confirm)",
    "Includes Status, Context, Decision, Consequences sections",
    "Runs pre-check script to detect duplicates"
  ]
}
```

### Scenario 2: ADR with Alternatives Comparison

```json
{
  "skills": ["creating-adrs"],
  "query": "データベース選定のADRを作成。PostgreSQLとMongoDBを比較した",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'ADR' and '選定'",
    "Lists both options in Considered Options section",
    "Organizes Pros/Cons for each option",
    "Clearly shows decision rationale",
    "Uses technology-selection template"
  ]
}
```

### Scenario 3: Process Change ADR

```json
{
  "skills": ["creating-adrs"],
  "query": "CI/CDパイプラインの変更についてADRを書きたい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'ADR' and '変更'",
    "Selects process-change template",
    "Documents before/after state",
    "Includes migration plan",
    "References related ADRs if exist"
  ]
}
```

### Scenario 4: Deprecation ADR

```json
{
  "skills": ["creating-adrs"],
  "query": "古いAPIバージョンを非推奨にするADRを作成",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '非推奨' keyword",
    "Selects deprecation template",
    "Includes deprecation timeline",
    "Documents migration path for users",
    "Links to replacement ADR if applicable"
  ]
}
```

### Scenario 5: ADR Update with Status Change

```json
{
  "skills": ["creating-adrs"],
  "query": "既存のADRを更新してステータスを変更したい",
  "files": ["docs/adr/0001-use-typescript.md"],
  "expected_behavior": [
    "Skill is triggered by 'ADR' and '更新'",
    "Explains ADR update best practices",
    "Shows Superseded/Deprecated status options",
    "Demonstrates linking to related ADRs",
    "Updates ADR index automatically"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by ADR-related keywords
- [ ] MADR format was followed correctly
- [ ] 6-phase process was executed
- [ ] pre-check.sh was run to detect duplicates
- [ ] Appropriate template was selected
- [ ] ADR index was updated

## Baseline Comparison

### Without Skill

- Manual ADR creation without structure
- May miss required sections
- No duplicate detection
- Inconsistent formatting

### With Skill

- Structured 6-phase process
- Template-based creation (technology-selection, process-change, deprecation)
- Automatic duplicate detection via pre-check.sh
- MADR format compliance
- Index auto-update
