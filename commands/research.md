---
description: Perform project research and technical investigation without implementation
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
model: inherit
context: fork
argument-hint: "[research topic or question]"
dependencies: [Explore]
---

# /research - Project Research & Investigation

Investigate codebase with confidence-based findings, without implementation.

## Process

```text
Phase 1: Scope Discovery (30 sec)
    └─ Project structure, tech stack, entry points

Phase 2: Investigation (1-3 min)
    ├─ Explore agent (overview)
    └─ 2-3 code-explorer agents (deep dive)

Phase 3: Synthesis (1 min)
    └─ Score findings, document unknowns
```

## Confidence Markers

| Marker | Confidence | Usage                       |
| ------ | ---------- | --------------------------- |
| [✓]    | >0.8       | Directly verified from code |
| [→]    | 0.5-0.8    | Reasonable inference        |
| [?]    | <0.5       | Assumption needing verify   |

## Agent Usage

```typescript
// Step 1: Overview
Task({ subagent_type: "Explore", ... })

// Step 2: Deep dive (parallel)
Task({ subagent_type: "feature-dev:code-explorer", ... })
```

## Output

```text
.claude/workspace/research/
├── YYYY-MM-DD-[topic].md          # Detailed findings
└── YYYY-MM-DD-[topic]-context.md  # For /think integration
```

## Required Sections

1. Purpose
2. Prerequisites (✓/→/?)
3. Available Data
4. Constraints
5. Key Findings
6. References

## Usage

```bash
/research "authentication system"
/research --quick "API structure"
/research --deep "complete architecture"
```

## Next Steps

- **Need planning** → `/think`
- **Found issues** → `/fix`
- **Ready to build** → `/code`
