---
description: Perform project research and technical investigation without implementation
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
model: opus
context: fork
argument-hint: "[research topic or question]"
dependencies: [Explore]
---

# /research - Project Research & Investigation

Investigate codebase with confidence-based findings, without implementation.

## Input

- Argument: research topic or question (required)
- If missing: prompt via AskUserQuestion

## Execution

1. Scope discovery (project structure, tech stack)
2. Investigation via `Explore` and `code-explorer` agents
3. Synthesis with confidence markers (✓/→/?)

## Output

```text
.claude/workspace/research/
├── YYYY-MM-DD-[topic].md          # Detailed findings
└── YYYY-MM-DD-[topic]-context.md  # For /think integration
```

### Required Sections

1. Purpose
2. Prerequisites (✓/→/?)
3. Available Data
4. Constraints
5. Key Findings
6. References
