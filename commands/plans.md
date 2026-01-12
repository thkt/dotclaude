---
description: List and view planning documents (SOW/Spec) in workspace
allowed-tools: Read, Glob
model: opus
argument-hint: "[feature-name]"
dependencies: [managing-planning]
---

# /plans - Planning Document Viewer

List and view planning documents (SOW/Spec).

## Input

- No argument: list all SOW documents
- Argument: specific feature name to view

## Execution

Search paths (project-specific first):

```text
.claude/workspace/planning/**/sow.md
~/.claude/workspace/planning/**/sow.md
```

## Output

```markdown
## Available SOW Documents

| #   | Location | Feature       | Date       |
| --- | -------- | ------------- | ---------- |
| 1   | Project  | feature-name  | 2025-01-14 |
| 2   | Global   | other-feature | 2025-01-13 |
```
