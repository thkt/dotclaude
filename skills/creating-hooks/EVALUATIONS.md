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

### Scenario 4: Task Completion Check (Stop Event)

```json
{
  "skills": ["creating-hooks"],
  "query": "タスク完了前にテストを実行したか確認するフックを作りたい",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'フック' and 'タスク完了'",
    "Uses stop event type configuration",
    "Creates transcript-based condition check",
    "Shows block action for missing tests",
    "Documents stop event field (transcript for conversation history)"
  ]
}
```

### Scenario 5: Custom Rule with /hookify Command

```json
{
  "skills": ["creating-hooks"],
  "query": "/hookify APIキーをハードコードしたら警告を出すルール",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '/hookify [description]' command format",
    "Generates Markdown rule file with YAML frontmatter",
    "Creates pattern for API key detection (KEY|SECRET|TOKEN)",
    "Sets warn action (not block) for non-critical issue",
    "Saves rule to .claude/hookify.[name].local.md"
  ]
}
```

## Rule Type Reference

| Type | Action | Use Case |
| --- | --- | --- |
| block | Prevents operation | Dangerous commands, security violations |
| warn | Shows warning, allows proceed | Code style, best practices |

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by hook keywords
- [ ] Correct event type (file/bash/stop/prompt/all) was selected
- [ ] Correct action type (block/warn) was selected
- [ ] Pattern matching syntax was correct (Python regex)
- [ ] Rule was saved to correct location (.claude/hookify.*.local.md)
- [ ] Clear feedback message was defined
- [ ] Conditions were properly configured when needed

## Baseline Comparison

### Without Skill

- Manual settings.json hook configuration required
- Python regex escape characters easily forgotten (e.g., `\.` for literal dot)
- No guidance on event type selection (file vs bash vs stop)
- Inconsistent rule file naming and location
- Trial-and-error testing of patterns

### With Skill

- Declarative Markdown rule definition with YAML frontmatter
- Pattern syntax guidance with examples (e.g., `rm\s+-rf`, `console\.log\(`)
- Clear block vs warn action selection based on severity
- Automatic rule file generation to `.claude/hookify.*.local.md`
- Pre-tested patterns from Anthropic's official hookify plugin examples
