---
name: _base-template
description: Template file - not an executable agent
---

# Reviewer Agent Base Template

Template for reviewer agents. Include only domain-specific content.

## YAML Frontmatter

```yaml
---
name: {domain}-reviewer
description: {brief description}
tools: [Read, Grep, Glob, LS, Task]
model: sonnet|haiku|opus
skills: [{relevant-skill}, applying-code-principles]
---
```

## Required Structure

```markdown
# {Domain} Reviewer

{One-line objective}

## Dependencies

- [@skill-path] - {description}
- [@./reviewer-common.md] - Confidence markers

## Focus/Patterns

{Domain-specific patterns with Bad/Good examples}

## Output

{Output template with tables}
```

## Confidence Markers

| Marker | Confidence | Usage         |
| ------ | ---------- | ------------- |
| [✓]    | ≥95%       | Verified      |
| [→]    | 70-94%     | Inferred      |
| [?]    | <70%       | Do NOT report |
