---
description: List and view planning documents (SOW/Spec) in workspace
allowed-tools: Read, Glob
model: opus
argument-hint: "[feature-name]"
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

For each SOW found, extract `Status:` line value.

## Output

```markdown
## Available SOW Documents

| #   | Location | Feature       | Date       | Status      |
| --- | -------- | ------------- | ---------- | ----------- |
| 1   | Project  | feature-name  | 2025-01-14 | in-progress |
| 2   | Global   | other-feature | 2025-01-13 | draft       |
```

### Status Legend

| Status      | Meaning                |
| ----------- | ---------------------- |
| draft       | Planning phase         |
| in-progress | Implementation started |
| completed   | All AC validated       |
| blocked     | Waiting on dependency  |
