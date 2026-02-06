# Performance Guidelines

## Context Management

| Strategy   | Guideline               | Rationale                           |
| ---------- | ----------------------- | ----------------------------------- |
| MCP tools  | Enable ≤10 per project  | Prevents 200k→70k context shrinkage |
| Plugins    | Enable only needed ones | Each adds token overhead            |
| `/compact` | Use when context >70%   | Preserves conversation history      |
| `/fork`    | Use for parallel tasks  | Avoids context pollution            |
