# Evaluations for generating-tdd-tests

## Selection Criteria

Keywords and contexts that should trigger this skill:

- Keywords: TDD, test-driven, RGRC, test creation, unit test, Baby Steps, Red-Green-Refactor
- Contexts: Test-driven development, test creation, implementation with tests

## Evaluation Scenarios (JSON Format - Anthropic Official Best Practices)

### Scenario 1: Basic TDD Cycle

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "I want to implement user authentication with TDD",
  "files": [],
  "expected_behavior": [
    "generating-tdd-tests skill is triggered",
    "Red-Green-Refactor-Commit cycle is explained",
    "Initial test cases to write are suggested"
  ]
}
```

### Scenario 2: Test Case Generation

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "I want to think about test cases for this validation function",
  "files": [],
  "expected_behavior": [
    "AAA (Arrange-Act-Assert) pattern is explained",
    "Boundary values, error cases, normal cases are covered",
    "Specific test code examples are provided"
  ]
}
```

### Scenario 3: Refactoring with Tests

```json
{
  "skills": ["generating-tdd-tests"],
  "query": "I want to add tests before refactoring existing code",
  "files": [],
  "expected_behavior": [
    "Characterization Test concept is explained",
    "Methods for creating tests that record current behavior are shown",
    "Safe refactoring approach is proposed"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] TDD/RGRC cycle referenced
- [ ] Practical test examples provided
