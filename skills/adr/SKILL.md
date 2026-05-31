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

- Decision title: `$ARGUMENTS` (specific action like "Adopt X for Y")
- If `$ARGUMENTS` is empty → select via AskUserQuestion
- Storage: `<git-root>/docs/decisions/` (MADR v4 default, enforced)
- Override: set `ADR_DIR` env var for non-standard locations

Use `$ARGUMENTS` to capture full input. `$N` is 0-indexed split (`$0` first word, `$1` second), so `$1` is unsuitable for full multi-word titles.

### Title Prompt

| Question      | Options                        |
| ------------- | ------------------------------ |
| Decision type | New decision / Update existing |

If "Update existing" → list recent ADRs in `<git-root>/docs/decisions/` for selection via AskUserQuestion.

## Adoption Gate

Before starting the 6-Phase Process, confirm all three conditions hold. If any one is missing, skip the ADR and record the decision somewhere lighter.

| # | Condition                                                                                            | Failing example                                          |
| - | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1 | Hard to reverse. Changing the decision later carries meaningful cost                                 | Library swap with one isolated import boundary           |
| 2 | Surprising without context. A future reader will ask "why this way?"                                 | Choosing the only option the framework supports          |
| 3 | Result of a real trade-off. Genuine alternatives existed and one was picked for specific reasons     | Following an established team convention by default      |

| Outcome                  | Demote to                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Conditions 1 or 2 fail   | `CONTEXT.md` entry (or equivalent project glossary / design notes)                   |
| Only condition 3 fails   | Commit message body (record the rationale alongside the change)                      |
| All three pass           | Proceed to the 6-Phase Process below                                                 |

Reference: mattpocock/skills `grill-with-docs` SKILL.md `Offer ADRs sparingly`.

## 6-Phase Process

| Phase         | Actions                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1. Pre-Check  | Run ${CLAUDE_SKILL_DIR}/scripts/pre-check.sh "$TITLE". Parse JSON for `number`, `filename`, `slug`, `adr_dir`, `similar_adrs`      |
| 2. Template   | Run ${CLAUDE_SKILL_DIR}/scripts/select-adr-template.sh "$TITLE". stdout returns the template name                                  |
| 3. References | Gather project docs, issues, external resources                                                                                    |
| 4. Validate   | Run ${CLAUDE_SKILL_DIR}/scripts/validate-adr.sh "$ADR_FILE" after writing. exit 0 + empty `errors[]` = pass. `warnings[]` advisory |
| 5. Index      | Run ${CLAUDE_SKILL_DIR}/scripts/update-index.sh to regenerate index README                                                         |
| 6. Recovery   | Handle missing dirs, duplicates, missing sections                                                                                  |

## Directory Resolution

| Step | Source                          | Behavior                                                               |
| ---- | ------------------------------- | ---------------------------------------------------------------------- |
| 1    | `$ADR_DIR` env var              | Use as-is when set                                                     |
| 2    | `git rev-parse --show-toplevel` | Resolve to `<git-root>/docs/decisions/`                                |
| 3    | Not in a git repo               | Error and exit. ADRs require a versioned project root                  |
| 4    | Skill-self protection           | If target contains `SKILL.md`, error (prevents writing into skill dir) |

## Template Selection

${CLAUDE_SKILL_DIR}/scripts/select-adr-template.sh "$TITLE" is a heuristic hint, not authority. Pick the template by the decision's intent; use the script as a starting suggestion.

| Template             | Use Case                   | Required MADR v4 sections                                                                                                |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| technology-selection | Library, framework choices | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome                                          |
| architecture-pattern | Structure, design policy   | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome                                          |
| process-change       | Workflow, rule changes     | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome                                          |
| deprecation          | Retiring technology        | Title, Context and Problem Statement, Considered Options (2+), Decision Outcome, More Information (deprecation-specific) |

### Keyword Triggers

Priority on multiple matches: deprecation > process-change > architecture-pattern > technology-selection (default).

| Template             | English keywords                                                                                | Japanese keywords                          |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| deprecation          | deprecate, remove, retire, sunset, phase out                                                    | 廃止, 非推奨, 削除, 撤廃                   |
| process-change       | process, workflow, procedure, standard, policy, rule, merge, branch, rebase, squash, review, ci | プロセス, ワークフロー, 規約, 規則, 手順   |
| architecture-pattern | pattern, architecture, design, structure, template, gateway, layer, monorepo, boundary          | パターン, アーキテクチャ, 設計, 構造, 統一 |
| technology-selection | adopt, choose, use, select (default when nothing else matches)                                  | (default)                                  |

### Override Rule

Override the script output when it does not match the decision's intent. Note the reason in the ADR's Context. The template you pick determines the required sections.

| Title example                                  | Script returns       | Override to          |
| ---------------------------------------------- | -------------------- | -------------------- |
| Migrate from squash-merge to rebase-merge      | technology-selection | process-change       |
| Replace REST gateway with tRPC monorepo layer  | technology-selection | architecture-pattern |

## Directory Structure

```text
<git-root>/
└── docs/
    └── decisions/
        ├── README.md   # Auto-generated index
        ├── 0001-*.md   # Sequential numbering (MADR nnnn-title)
        └── 0002-*.md   # (next)
```

## Rules

| Rule         | Detail                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| Immutability | Decision content immutable once accepted. See Supersede Procedure            |
| Brevity      | Per-template line budget. See Line Budget                                    |
| Frontmatter  | YAML frontmatter optional. See Frontmatter Conventions                       |
| Confirmation | `### Confirmation` under Decision Outcome describes how to verify compliance |

### Frontmatter Conventions (MADR v4)

```yaml
---
status: "proposed | rejected | accepted | deprecated | superseded by ADR-NNNN"
date: 2026-04-25
decision-makers: list of names or roles
consulted: subject-matter experts (two-way)
informed: stakeholders kept up-to-date (one-way)
---
```

| Field           | Required | Notes                                                           |
| --------------- | -------- | --------------------------------------------------------------- |
| status          | Optional | YAML quotes required. Identifier only, no links                 |
| date            | Optional | YYYY-MM-DD of creation; updated only when the ADR is superseded |
| decision-makers | Optional | Renamed from `deciders` in v4                                   |

### Supersede Procedure

When a new ADR replaces an existing one:

| Step | Action                                                                          |
| ---- | ------------------------------------------------------------------------------- |
| 1    | Create the new ADR via the normal 6-Phase Process                               |
| 2    | New ADR's `More Information` cites the predecessor (e.g. `Supersedes ADR-NNNN`) |
| 3    | In the old ADR, change `status:` to `superseded by ADR-NNNN`                    |
| 4    | Update old ADR's `date:` to today                                               |
| 5    | Run update-index.sh to refresh the index                                        |

Only `status` and `date` change in the old ADR. Decision content stays as-is.

### Line Budget

| Templates                                   | Total budget | Per section                                                       |
| ------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| technology-selection / architecture-pattern | ~80 lines    | Context 3 lines, Options 3-5 lines each, Consequences 2-3 bullets |
| process-change / deprecation                | ~100 lines   | Same per-section guidance                                         |

## Output

- `<git-root>/docs/decisions/XXXX-slug.md` (ADR file)
- `<git-root>/docs/decisions/README.md` (auto-generated index)

## References

| Topic     | Resource                                      |
| --------- | --------------------------------------------- |
| MADR      | ${CLAUDE_SKILL_DIR}/references/madr-format.md |
| Fowler    | ${CLAUDE_SKILL_DIR}/references/fowler-adr.md  |
| Templates | ${CLAUDE_SKILL_DIR}/templates/                |
| Scripts   | ${CLAUDE_SKILL_DIR}/scripts/                  |
