# Evaluations for creating-hooks

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: hook, hookify, rule, block, warn, prevent, pattern, detect, unwanted behavior, dangerous command, coding standards, フック, ルール, ブロック, 警告, 防止, パターン, 検出, コーディング規約
- **Contexts**: Hook creation, behavior prevention, /hookify command

## Evaluation Scenarios

### Scenario 1: Dangerous Command Prevention

```json
{
  "skills": ["creating-hooks"],
  "query": "rm -rf / のような危険なコマンドをブロックするフックを作りたい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'ブロック' and 'フック'",
    "Creates block rule with pattern matching",
    "Defines dangerous command patterns",
    "Shows how to add to settings.json",
    "Tests the rule before deployment"
  ]
}
```

### Scenario 2: Coding Standards Enforcement

```json
{
  "skills": ["creating-hooks"],
  "query": "console.log を使ったら警告を出すフックを作成して",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '警告' and 'フック'",
    "Creates warn rule (not block)",
    "Defines console.log detection pattern",
    "Shows user-friendly warning message",
    "Allows override if needed"
  ]
}
```

### Scenario 3: Pattern Detection Rule

```json
{
  "skills": ["creating-hooks"],
  "query": "特定のパターンを検出してフィードバックするフックを作りたい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'パターン' and '検出'",
    "Creates pattern-matching rule",
    "Shows regex or glob pattern syntax",
    "Configures feedback message",
    "Documents rule file location"
  ]
}
```

### Scenario 4: Pre-Commit Hook Integration

```json
{
  "skills": ["creating-hooks"],
  "query": "コミット前に特定のチェックを実行するフックを設定したい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'コミット' and 'フック'",
    "Shows PreCommit hook configuration",
    "Integrates with git hooks",
    "Defines check commands",
    "Handles hook failure gracefully"
  ]
}
```

### Scenario 5: Custom Rule with /hookify

```json
{
  "skills": ["creating-hooks"],
  "query": "/hookify APIキーをコードに直接書いたら警告",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '/hookify'",
    "Generates YAML rule definition",
    "Creates pattern for API key detection",
    "Sets warn level (not block)",
    "Saves rule to appropriate location"
  ]
}
```

## Rule Type Reference

| Type | Action | Use Case |
|------|--------|----------|
| block | Prevents operation | Dangerous commands, security violations |
| warn | Shows warning, allows proceed | Code style, best practices |

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by hook keywords
- [ ] Correct rule type (block/warn) was selected
- [ ] Pattern matching syntax was correct
- [ ] Rule was saved to correct location
- [ ] Clear feedback message was defined
- [ ] Rule was tested before deployment

## Baseline Comparison

### Without Skill

- Manual settings.json editing
- May miss pattern syntax
- No rule testing
- Inconsistent rule format

### With Skill

- Declarative rule definition
- Pattern syntax guidance
- Block vs warn selection
- Automatic rule file generation
- Based on Anthropic's official hookify plugin
