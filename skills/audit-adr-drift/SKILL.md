---
name: audit-adr-drift
description: Scan ADR Decision sections against current code and report drift with modification direction and priority. Do NOT use for repos without ADRs (use audit-adr-gaps instead).
when_to_use: ADR と コードの整合性確認, ADR drift, ADR vs code, ADR audit, 意思決定の風化チェック, decision record divergence
allowed-tools: Read Write Edit LS Bash(git:*) Bash(gh:*) Bash(ugrep:*) Bash(bfs:*) Bash(yomu:*) Bash(sqlite3:*) Task AskUserQuestion
model: opus
argument-hint: "[adr-directory]"
---

# /audit-adr-drift - ADR vs Code Drift Scanner

Scan each ADR's Decision section against the current codebase. Record drift with file:line, modification direction, and priority so ADRs can serve as a usable refactoring baseline.

## When to Use

- Repo has ADRs and the Decision text has not been systematically checked against current code
- Before a refactor, you want to know whether ADRs are still trustworthy
- ADR Note additions or main-body updates need to be triaged

Skip this skill when no ADR directory exists; run `/audit-adr-gaps` first to elevate decisions into ADRs.

### Pairing with /audit-adr-gaps

`/audit-adr-gaps` and `/audit-adr-drift` form an ADR-baseline audit pair. Run order depends on whether ADRs already exist, not a fixed sequence.

| Repo state            | Run first                                              | Then                                            |
| --------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| ADRs exist            | `/audit-adr-drift` (drift between ADR and code)        | `/audit-adr-gaps` (gaps drift cannot see)       |
| ADRs absent or sparse | `/audit-adr-gaps` (mine decisions into ADR candidates) | `/audit-adr-drift` (verify once ADRs are added) |

## Input

`$ARGUMENTS` may contain a single ADR directory path. Parse before use:

- Trim whitespace; treat empty as "auto-detect"
- If non-empty, treat the value as a path relative to repo root. Reject if it does not exist
- Auto-detect order: `docs/decisions/`, `docs/adr/`, `architecture/decisions/`, `adr/`
- If multiple ADR directories exist, AskUserQuestion to select
- If none exist, abort with "No ADRs found, run /audit-adr-gaps first"

## Execution

| Step | Action                                                                             |
| ---- | ---------------------------------------------------------------------------------- |
| 1    | Detect ADR directory (auto-detect or `$ARGUMENTS`)                                 |
| 2    | List ADRs and extract Status (Accepted / Superseded / Proposed)                    |
| 3    | Per ADR: extract Decision section + referenced symbols (functions, types, modules) |
| 4    | Search references with ugrep/yomu; build drift candidates                          |
| 5    | Run language-appropriate reviewer agents on candidate sites                        |
| 6    | Tag each finding with modification direction (code-fix / adr-update / accept)      |
| 7    | Tag each finding with priority (H / M / L)                                         |
| 8    | Write report to `docs/audit/<YYYY-MM-DD>-adr-drift.md`                             |
| 9    | List H-priority drifts as candidate follow-up issues                               |

### Step 1: ADR Detection

Search top-level then `docs/` for the canonical ADR locations. If multiple match, ask the user.

| Path                      | Common projects       |
| ------------------------- | --------------------- |
| `docs/decisions/`         | MADR-style projects   |
| `docs/adr/`               | adr-tools-style       |
| `architecture/decisions/` | Larger monorepos      |
| `adr/`                    | Root-level convention |

### Step 2: Status Extraction

Parse each ADR's front matter or top section for Status. Map Superseded ADRs to their successor via `Superseded by [...]` link.

### Step 3: Decision Symbol Extraction

Extract code-identifiers (function names, type names, module names, file paths) and bullet-point decisions from the Decision section. Skip prose-only ADRs (record as "unverifiable, prose-only").

### Step 4: Reference Search

For each extracted symbol:

- `ugrep -r "<symbol>"` for literal matches
- `yomu search <symbol>` for semantic matches (TS/Rust/CSS/HTML)
- Filter out the ADR file itself and test fixtures

#### External ADR Cross-Check

Additionally, scan the entire codebase for `ADR-NNNN` (uppercase) and `adr-nnnn` (lowercase) reference patterns:

```bash
ugrep -r -n -E "ADR-[0-9]{4}|adr-[0-9]{4}" --include="*.rs" --include="*.md" --include="*.toml" .
```

For each captured ADR id, check whether the matching `NNNN-*.md` file exists in the ADR directory detected in Step 1. References to ADR ids not present locally are flagged as External ADR dependencies and recorded in a separate report section (Step 8). This catches the case where code references a meta ADR living in a different repo (e.g., a shared `dotclaude` config) and the local ADR has not been promoted.

### Step 5: Reviewer Selection

Detect repo language by manifest file and run the matching reviewer(s) via Task tool.

| Detection                     | Reviewer(s) to spawn                         |
| ----------------------------- | -------------------------------------------- |
| `Cargo.toml`                  | reviewer-rust + reviewer-design              |
| `package.json` with `*.tsx`   | reviewer-strictness + reviewer-react-pattern |
| `package.json` (other)        | reviewer-strictness + reviewer-design        |
| `pyproject.toml` / `setup.py` | reviewer-design (language-agnostic only)     |
| `go.mod`                      | reviewer-design (language-agnostic only)     |
| Other / Unknown               | reviewer-design                              |

Reviewers receive the candidate file:line list plus the ADR Decision text. They flag semantic gaps clippy or grep cannot detect.

### Step 6: Modification Direction

| Direction    | When                                                       |
| ------------ | ---------------------------------------------------------- |
| `code-fix`   | ADR Decision is the correct contract; code drifted         |
| `adr-update` | Code is the correct contract; ADR is stale (Note or super) |
| `accept`     | Drift is cosmetic, deprecated comment, or documented       |

### Step 7: Priority

| Priority | Criteria                                                |
| -------- | ------------------------------------------------------- |
| H        | Public API impact, or 2+ downstream consumers affected  |
| M        | Internal API, single consumer                           |
| L        | Doc-string only, dead reference, or comment-level drift |

### Step 8: Report Output

Compute the date with `date -u +%Y-%m-%d` (UTC, ISO format) for cross-timezone consistency. Ensure the output directory exists:

```bash
mkdir -p docs/audit
DATE=$(date -u +%Y-%m-%d)
REPORT="docs/audit/${DATE}-adr-drift.md"
```

Write the report with:

```markdown
# ADR Drift Scan: <YYYY-MM-DD>

## Summary

| Metric            | Value |
| ----------------- | ----- |
| ADRs scanned      | N     |
| Drift findings    | N     |
| H priority        | N     |
| M priority        | N     |
| L priority        | N     |
| Unverifiable ADRs | N     |

## Per-ADR Findings

### ADR <id>: <title>

Status: <Accepted/Superseded>

| # | File:Line   | Description | Direction | Priority |
| - | ----------- | ----------- | --------- | -------- |
| 1 | src/x.rs:42 | ...         | code-fix  | H        |

(repeat per ADR)

## External ADR Dependencies

| # | File:Line     | External ADR ref     | Recommended action                              |
| - | ------------- | -------------------- | ----------------------------------------------- |
| 1 | src/foo.rs:55 | ADR-NNNN (not local) | Promote to scout-local ADR or supersede locally |

## Follow-up Issue Candidates

- [ ] ADR <id> drift at <file:line>: <one-line summary>
```

### Step 9: Follow-up Hand-off

Print the H-priority follow-up candidates and offer to invoke `/issue` for each.

## Output

- Report path: `docs/audit/<YYYY-MM-DD>-adr-drift.md`
- Console summary: ADR count, finding count, H/M/L breakdown
- Optional: H-priority issue creation via `/issue`

## Out of Scope

- Implementing code fixes (separate work)
- Rewriting ADR bodies beyond Note additions (start a new ADR with Supersedes link)
- Discovering decisions that have no ADR (use `/audit-adr-gaps`)

## Acceptance Criteria

- [ ] Report file exists at `docs/audit/<YYYY-MM-DD>-adr-drift.md`
- [ ] Every ADR has a section (drift findings or "no drift" or "unverifiable")
- [ ] Every drift finding has file:line, ADR ref, direction, priority
- [ ] Superseded ADRs include a note-vs-rewrite recommendation
- [ ] H-priority drifts are listed as follow-up candidates
