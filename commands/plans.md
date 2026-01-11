---
description: List and view planning documents (SOW/Spec) in workspace
allowed-tools: Read, Glob
model: inherit
dependencies: [managing-planning]
---

# /plans - Planning Document Viewer

List and view planning documents (SOW/Spec).

## Functionality

### Find Documents

```text
# Project-specific (searched first)
.claude/workspace/planning/**/sow.md

# Global
~/.claude/workspace/planning/**/sow.md
```

## Output Format

```text
Available SOW Documents

[Project] .claude/workspace/
  1. 2025-01-14-oauth-authentication (2025-01-14)

[Global] ~/.claude/workspace/
  2. 2025-01-13-api-refactor (2025-01-13)
```

## Usage

```bash
/plans                   # List all
/plans --latest          # View latest
/plans "feature-name"    # View specific
```

## Integration

```text
1. Create: /think "feature"
2. View: /plans
3. Implement: /code
4. Validate: /validate
```

## Related

- `/sow` - Create SOW
- `/spec` - Create Spec
- `/think` - Create SOW + Spec
- `/validate` - Validate implementation
