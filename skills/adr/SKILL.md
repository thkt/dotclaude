---
name: adr
description: Create Architecture Decision Records (ADR) in MADR format with auto-numbering. Use when: ADR作成, 技術決定, アーキテクチャ決定, decision record.
allowed-tools: Read, Write, Edit, Grep, Glob, LS, Bash(mkdir:*), Bash($HOME/.claude/skills/adr/scripts/*), AskUserQuestion
model: opus
argument-hint: "[decision title]"
user-invocable: true
---

# /adr - Architecture Decision Record Creator

## Input

- Decision title: `$1` (specific action like "Adopt X for Y")
- If `$1` is empty → select via AskUserQuestion
- Prerequisites: `adr/` directory (create if missing)

### Title Prompt

| Question      | Options                        |
| ------------- | ------------------------------ |
| Decision type | New decision / Update existing |

If "Update existing" → list recent ADRs in `adr/` for selection via AskUserQuestion.

## 6-Phase Process

| Phase         | Actions                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| 1. Pre-Check  | Run `./scripts/pre-check.sh "$TITLE"`                                    |
| 2. Template   | Run `./scripts/select-adr-template.sh "$TITLE"`                          |
| 3. References | Gather project docs, issues, external resources                          |
| 4. Validate   | Run `./scripts/validate-adr.sh "$ADR_FILE"` after writing                |
| 5. Index      | Run `./scripts/update-index.sh` to regenerate `adr/README.md`            |
| 6. Recovery   | Handle missing dirs, duplicates, missing sections                        |

## Template Selection

Auto-select via script:

```bash
TEMPLATE=$(./scripts/select-adr-template.sh "$TITLE")
```

| Template             | Use Case                   | Required Sections          |
| -------------------- | -------------------------- | -------------------------- |
| technology-selection | Library, framework choices | Options (min 3), Pros/Cons |
| architecture-pattern | Structure, design policy   | Context, Consequences      |
| process-change       | Workflow, rule changes     | Before/After comparison    |
| deprecation          | Retiring technology        | Migration plan, Timeline   |

## Directory Structure

```text
adr/
├── README.md   # Auto-generated index
├── 0001-*.md   # Sequential numbering
└── 0002-*.md   # (next)
```

## Rules

| Rule         | Detail                                                                                  |
| ------------ | --------------------------------------------------------------------------------------- |
| Immutability | Once accepted, never modify. To change, create a new ADR that supersedes it             |
| Brevity      | Target ~80 lines. Context: 3 lines. Options: 3-5 lines each. Consequences: 2-3 bullets |
| Confidence   | `- Confidence: {level} — {rationale}` in metadata. Level + reason in one line           |
| Reassessment | Optional `## Reassessment Triggers` section after Consequences                          |

### Confidence Levels

| Level  | When to use                                              |
| ------ | -------------------------------------------------------- |
| high   | All options evaluated, clear winner, team consensus      |
| medium | Some unknowns remain, limited production data            |
| low    | Best guess under constraints, significant unknowns exist |

## Output

- `adr/XXXX-slug.md` (ADR file)
- `adr/README.md` (auto-generated index)

## References

| Topic     | Resource                                                              |
| --------- | --------------------------------------------------------------------- |
| MADR      | <https://adr.github.io/madr/>                                         |
| Fowler    | <https://martinfowler.com/articles/architecture-decision-record.html> |
| Templates | `./templates/`                                                        |
| Scripts   | `./scripts/`                                                          |
