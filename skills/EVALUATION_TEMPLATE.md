# Evaluations Template for Skills

This template is a guide for creating quality evaluation scenarios for skills.

## Usage

1. Copy this template and save as `[skill-name]/EVALUATIONS.md`
2. Replace `[skill-name]` with the actual skill name
3. Specify concrete queries and expected behaviors for each scenario
4. Create at least 3 evaluation scenarios

---

## Template (Copy Below)

````markdown
# Evaluations for [skill-name]

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: [trigger keywords in Japanese and English]
- **Contexts**: [usage contexts, related commands]

## Evaluation Scenarios (JSON Format)

**Field Reference**:

- `skills`: Skill name(s) being evaluated
- `query`: User request (use Japanese for realistic testing)
- `files`: Context files to provide during evaluation (empty if none needed)
- `expected_behavior`: List of 3-5 observable behaviors to verify

### Scenario 1: Basic Usage

```json
{
  "skills": ["[skill-name]"],
  "query": "[typical user request]",
  "files": [],
  "expected_behavior": [
    "Skill is triggered and loaded",
    "Correct reference files are accessed",
    "Output follows skill guidelines"
  ]
}
```

### Scenario 2: Edge Case

```json
{
  "skills": ["[skill-name]"],
  "query": "[edge case request]",
  "files": [],
  "expected_behavior": [
    "Handles edge case gracefully",
    "Provides appropriate fallback or guidance"
  ]
}
```

### Scenario 3: Error Handling

```json
{
  "skills": ["[skill-name]"],
  "query": "[problematic request]",
  "files": [],
  "expected_behavior": [
    "Provides clear error message",
    "Suggests alternatives or next steps"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] Expected behaviors were observed
- [ ] Output quality meets standards

## Baseline Comparison

### Without Skill

- [List limitations without the skill]

### With Skill

- [List improvements with the skill]
````

---

## Optional Additional Sections

The following sections are OPTIONAL and should be included based on skill characteristics.

### Decision Flow for Optional Sections

```text
Start
  │
  ├─ Does skill have enumerable types/actions/modes?
  │    YES → Add "Domain-Specific Quick Reference" table
  │    NO  → Skip
  │
  ├─ Is SKILL.md > 400 lines?
  │    YES → Add "Progressive Disclosure Verification" checklist
  │    NO  → Skip
  │
  ├─ Does skill integrate with commands or agents?
  │    YES → Add "Integration Points" section
  │    NO  → Skip
  │
  └─ Does skill generate structured files?
       YES → Add "File Examples" section
       NO  → Skip
```

### Domain-Specific Quick Reference (When Applicable)

For skills with specific terminology or action types, include a quick reference table:

```markdown
## [Domain] Reference

| Type | Description | Use Case |
|------|-------------|----------|
| type-a | Does X | Scenario Y |
| type-b | Does Z | Scenario W |
```

**Use when**: Skill has enumerable types, actions, or modes (e.g., creating-hooks has block/warn actions)

### Progressive Disclosure Verification (For Long Skills)

For skills approaching the 500-line limit, include verification that progressive disclosure is implemented:

```markdown
## Progressive Disclosure Verification

- [ ] SKILL.md serves as overview (<500 lines)
- [ ] Detailed content in separate reference files
- [ ] Clear links to detailed documentation
- [ ] Overview sufficient for basic usage
```

**Use when**: SKILL.md approaches 400+ lines

### Integration Points (For System Skills)

For skills that integrate with commands/agents, document the integration:

```markdown
## Integration Points

### With Commands
- /command-name: How skill integrates

### With Agents
- agent-name: How skill supports agent
```

**Use when**: Skill is used by multiple commands or agents

### File Examples (For File-Generating Skills)

For skills that create specific file formats:

```markdown
## Output Format Examples

### Example: [Description]
[Code block showing expected output format]
```

**Use when**: Skill generates structured output files (e.g., ADRs, configs)
