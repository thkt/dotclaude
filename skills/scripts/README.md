# Shared Scripts

Validation utilities shared across skills.

**Note**: This is NOT a skill. SKILL.md is intentionally absent.

## Usage

```bash
# Validate a single skill
bash ~/.claude/skills/scripts/validate-template.sh ~/.claude/skills/[skill-name]

# Validate all skills
bash ~/.claude/skills/scripts/validate-all.sh

# Validate Markdown files
bash ~/.claude/skills/scripts/validate-markdown.sh [file.md]
```

## Files

| File | Purpose |
| --- | --- |
| `validate-template.sh` | Skill structure validation (SKILL.md, frontmatter) |
| `validate-all.sh` | Batch validation for all skills |
| `validate-markdown.sh` | Markdown file validation |
