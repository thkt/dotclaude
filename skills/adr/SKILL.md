---
name: adr
description: Create Architecture Decision Records (ADR) in MADR v4 format with auto-numbering.
when_to_use: ADR作成, 技術決定, アーキテクチャ決定, decision record
allowed-tools: Read Write Edit LS Bash(mkdir:*) Bash($HOME/.claude/skills/adr/scripts/*) AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[decision title]"
---

# /adr - Architecture Decision Record Creator

## Input

Take the decision title from `$ARGUMENTS` and shape it into a specific action like "Adopt X for Y". If empty, confirm New decision / Update existing via AskUserQuestion; for Update existing, list recent ADRs in `<git-root>/docs/decisions/` for selection. To change the storage location, set the `ADR_DIR` env var before running.

## Adoption Gate

Proceed to the 6-Phase Process only when all three conditions hold. Otherwise skip the ADR; if condition 1 or 2 is missing, record the decision as a `CONTEXT.md` entry (or an equivalent design note), and if only condition 3 is missing, record it in the commit message body.

1. Hard to reverse. Changing the decision later carries meaningful cost
2. Surprising without context. A future reader will ask "why this way?"
3. Result of a real trade-off. Genuine alternatives existed and one was picked for specific reasons

## Rules

| Rule         | Detail                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| Immutability | Decision content immutable once accepted. See Supersede Procedure            |
| Brevity      | Per-type size limit. See Decision Type                                       |
| Frontmatter  | YAML frontmatter optional. See YAML Frontmatter                              |
| Confirmation | `### Confirmation` under Decision Outcome describes how to verify compliance |

## YAML Frontmatter (MADR v4)

| Field           | Required | Notes                                                                                                   |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| status          | No       | One of proposed, rejected, accepted, deprecated, superseded by ADR-NNNN. YAML quotes required; no links |
| date            | No       | YYYY-MM-DD of creation; updated only when the ADR is superseded                                         |
| decision-makers | No       | List of names or roles. Renamed from `deciders` in v4                                                   |
| consulted       | No       | Subject-matter experts (two-way)                                                                        |
| informed        | No       | Stakeholders kept up-to-date (one-way)                                                                  |

### Supersede Procedure

When a new ADR replaces an existing one. Only `status` and `date` change in the old ADR; decision content stays as-is.

| Step | Action                                                                          |
| ---- | ------------------------------------------------------------------------------- |
| 1    | Create the new ADR via the normal 6-Phase Process                               |
| 2    | New ADR's `More Information` cites the predecessor (e.g. `Supersedes ADR-NNNN`) |
| 3    | In the old ADR, change `status:` to `superseded by ADR-NNNN`                    |
| 4    | Update old ADR's `date:` to today                                               |
| 5    | Run ${CLAUDE_SKILL_DIR}/scripts/update-index.py to refresh the index            |

## Decision Type

Pick the decision type by the decision's intent; it only affects which recommended More Information topics to include. Per-section guidance is common to all types: Context 3 lines, Options 3-5 lines each, Consequences 2-3 bullets.

| Decision type        | Use Case                   | Line limit | Recommended topics                                                            |
| -------------------- | -------------------------- | ---------- | ----------------------------------------------------------------------------- |
| technology-selection | Library, framework choices | 80 lines   | Migration Strategy, Rollback Plan, Success Criteria                           |
| architecture-pattern | Structure, design policy   | 80 lines   | Architecture Diagram, Quality Attributes, Trade-offs                          |
| process-change       | Workflow, rule changes     | 100 lines  | Before / After comparison, Transition Plan, Review Schedule                   |
| deprecation          | Retiring technology        | 100 lines  | Deprecation Target, Migration Plan, Deprecation Warning Period, Rollback Plan |

## 6-Phase Process

| Step | Phase      | Actions                                                                                                                                                |
| ---- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Pre-Check  | Run ${CLAUDE_SKILL_DIR}/scripts/pre-check.py "$TITLE". If `similar_adrs` is non-empty, confirm the potential duplicate with the user before proceeding |
| 2    | Type       | Determine the decision type by the decision's intent and pick recommended topics from the Decision Type table                                          |
| 3    | References | Gather project docs, issues, external resources                                                                                                        |
| 4    | Validate   | Run ${CLAUDE_SKILL_DIR}/scripts/validate-adr.py "$ADR_FILE" after writing. exit 0 + empty `errors[]` = pass. `warnings[]` advisory                     |
| 5    | Index      | Run ${CLAUDE_SKILL_DIR}/scripts/update-index.py to regenerate index README                                                                             |
| 6    | Recovery   | Handle missing dirs, duplicates, missing sections                                                                                                      |

## Output

| Path                                     | Description          |
| ---------------------------------------- | -------------------- |
| `<git-root>/docs/decisions/XXXX-slug.md` | ADR file             |
| `<git-root>/docs/decisions/README.md`    | Auto-generated index |

## References

| Topic    | Resource                                       |
| -------- | ---------------------------------------------- |
| MADR     | ${CLAUDE_SKILL_DIR}/references/madr-format.md  |
| Fowler   | ${CLAUDE_SKILL_DIR}/references/fowler-adr.md   |
| Template | ${CLAUDE_SKILL_DIR}/templates/madr-template.md |
| Scripts  | ${CLAUDE_SKILL_DIR}/scripts/                   |
