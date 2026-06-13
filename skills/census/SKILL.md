---
name: census
description: Discover undocumented design decisions and challenge each candidate via critic-design before promotion. Rank by impact and reversibility, produce ADR promotion candidates. Treat each candidate as a position arguing for ADR status, not a fact to be filed. Pairs with adrift, which scans existing ADRs for drift against code.
when_to_use: 判断未記録の発掘, undocumented decisions, ADR候補発掘, 設計判断棚卸し, decision archaeology, design rationale audit
allowed-tools: Read Write LS Bash(mkdir:*) Bash(date:*) Bash(python3:*) Bash(ugrep:*) Bash(bfs:*) Bash(wc:*) Task AskUserQuestion
model: opus
argument-hint: "[--threshold=N] [--paths=path,path]"
---

# /census - ADR Gaps Audit

Discover design decisions that exist in the code but have no ADR. Each candidate is challenged by critic-design (Step 6.2) before promotion. The final list is what survived the adversarial pass, not what the initial scan found. Produce a ranked list of ADR promotion candidates so the next refactor has a complete decision baseline.

## When to Use

- Repo has accumulated implicit decisions that are not in ADRs
- Before refactoring, you want to know which decisions to preserve vs question
- New maintainers need a map of "why is the code shaped this way"

### Pairing with /adrift

`/census` and `/adrift` form an ADR-baseline audit pair. Run order depends on whether ADRs already exist, not a fixed sequence.

| Repo state            | Run first                                      | Then                                   |
| --------------------- | ---------------------------------------------- | -------------------------------------- |
| ADRs exist            | `/adrift` (drift between ADR and code)         | `/census` (gaps drift cannot see)      |
| ADRs absent or sparse | `/census` (mine decisions into ADR candidates) | `/adrift` (verify once ADRs are added) |

## Input

`$ARGUMENTS` holds the full argument string. Parse before use:

- Split on whitespace into tokens
- `--threshold=N`: integer, default `400` if unset or non-numeric (must be `> 0`)
- `--paths=p1,p2,...`: comma-separated paths to documents. If unset, auto-detect via Step 2 table
- `--no-challenge`: skip the critic-design challenge step (default: challenge runs)
- Reject unknown flags with an explicit error rather than silently ignore
- All flags optional; with no input, auto-detect everything and run challenge

## Step 1: Large File Detection

```bash
# Find source files exceeding the threshold
# NOTE: Do not use awk '$1 > t' here. SKILL loader expands `$1` to the second
# whitespace-token of $ARGUMENTS (0-indexed split). Use find+while instead.
bfs <repo-root> -type f \( -name '*.rs' -o -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.go' -o -name '*.swift' \) \
  -not -path '*/target/*' -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -print0 \
  | while IFS= read -r -d '' file; do
      lines=$(wc -l < "$file")
      [ "$lines" -gt "$THRESHOLD" ] && printf '%s %s\n' "$lines" "$file"
    done | sort -rn
```

Default threshold is 400 lines (one-screen ceiling).

## Step 2: Document Detection

Scan top-level and `docs/` for decision-bearing documents (README, CONTRIBUTING, SECURITY, THREAT_MODEL, ARCHITECTURE, DESIGN, CLAUDE.md / AGENTS.md, Makefile / justfile, linter configs). Full pattern-to-content table: ${CLAUDE_SKILL_DIR}/references/detection-targets.md.

## Step 3: Large File Decision Mining

For files exceeding 800 lines (2x threshold), run a triage sub-step first: spawn the reviewer with a "scan first 200 lines and estimate finding density (findings per 100 lines)" instruction, then AskUserQuestion with three options:

- Continue full scan
- Truncate to first 600 lines (covers module preamble and main types)
- Skip this file (record as `skipped_for_size`)

For files at or below 800 lines, proceed directly to full scan.

For each large file (full or truncated scope), spawn the matching reviewer via Task (same routing as `/adrift` Step 5). The reviewer answers:

- Why is this file shaped at this granularity?
- What invariant or contract does it carry that a reader cannot derive from the code?
- Is there a comment or module-doc that already records the rationale?
- Does the comment describe the current state but omit the rule for future contributors? (this is the `incomplete-contract` pattern)

Findings format: `file:line` + decision summary + evidence (code comment, naming, module-doc) + `documented?` (Yes/Partial/No) + `incomplete-contract?` (Yes/No). The `incomplete-contract` flag marks code whose comment says what is true but not what must remain true (a missing rule for future contributors); promotion is handled in Step 6.1, with examples in ${CLAUDE_SKILL_DIR}/references/decision-criteria.md.

After collecting findings, cross-reference each one against the ADR directory (if any). Drop findings already covered by an ADR (record count as "ADR-covered (excluded)" in the summary).

## Step 4: Prose Decision Extraction

For each detected document, find sentences containing decision verbs and check for ADR coverage:

- Decision verbs (English): "decide", "choose", "adopt", "reject", "deprecate", "must not", "never", "always"
- Decision verbs (Japanese): "決定", "採用", "禁止", "方針", "選定", "排除", "従う", "規約"

Each match is a candidate. Then for each candidate, search the ADR directory (if any) for cross-reference. Drop candidates already covered by an ADR.

### External ADR Dependency Detection

In addition to prose docs, detect `ADR-NNNN` references in source code that are not promoted locally. Run `python3 ${CLAUDE_SKILL_DIR}/../_lib/external-adr-refs.py --json`. It auto-detects the canonical ADR directories (docs/decisions, docs/adr, architecture/decisions, adr) and returns `ADR-NNNN` references whose `NNNN-*.md` has no local match as `external_refs`. In a repo with no ADR directory, every reference is external.

Record each id in `external_refs` as an External ADR Dependency candidate. External ADR dependencies are flagged for promotion (write a scout-local ADR that supersedes or imports the external decision). This is impact=H by default because cross-repo ADR drift is silent and hard to detect after the fact.

## Step 5: Impact + Reversibility Tagging

| Impact | Criteria                                                              |
| ------ | --------------------------------------------------------------------- |
| H      | Crosses module boundary, affects public API, or governs 2+ subsystems |
| M      | Affects single module's internal contract                             |
| L      | Local style or naming choice                                          |

| Reversibility | Criteria                                                         |
| ------------- | ---------------------------------------------------------------- |
| high          | Decision can be reversed by editing one location                 |
| medium        | Reversal requires coordinated changes across 2-5 files           |
| low           | Reversal requires migration, deprecation cycle, or schema change |

## Step 6: Ranking and Challenge

### 6.1 Initial Ranking

ADR promotion candidates = (impact=H) AND (reversibility=low OR medium).

Findings with `incomplete-contract=Yes` are also promoted regardless of `documented?` value, because the missing rule for future contributors is precisely what an ADR records (and a comment, by itself, cannot).

Other findings are recorded but not promoted (informational).

### 6.2 Devil's Advocate Challenge

Skip this sub-step if `--no-challenge` is set.

Spawn `critic-design` via Task with the initial promotion candidate list. The agent challenges each candidate with:

- Does a future contributor actually benefit from the rule? Who is the reader?
- Can a code comment + test suffice instead of an ADR?
- Does ADR risk lock-in (over-documenting decisions that should evolve)?
- For statement-of-fact configs (deny.toml, Cargo.toml lints): is the config file itself already the source of truth, making an ADR redundant?
- For monolithic-boundary candidates: would the ADR justify the status quo and reduce pressure to split?
- Is there already an enforcement mechanism (type system, lint, test) that makes the rule mechanical, leaving the ADR with nothing to add?
- Bug vs Invariant: is this candidate describing a fix-the-bug case (current code is wrong and should change) or an invariant-to-document case (current code is intentional and should be preserved)? Bugs must be surfaced as bug-fix follow-ups, not ADRs. Documenting wrong behavior as intentional locks in the bug.

ADR worth heuristic and incomplete-contract examples: see ${CLAUDE_SKILL_DIR}/references/decision-criteria.md (pass to critic-design alongside the candidate list).

For each candidate, critic-design returns one of:

| Verdict     | Meaning                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keep`      | ADR worth, file as standalone or merge with related candidates                                                                                                    |
| `downgrade` | Not standalone ADR; absorb into a related ADR section or strengthen comments                                                                                      |
| `drop`      | Not ADR-worthy; config/comment/test already covers it, cost > value, or the candidate is a bug (surface as bug-fix follow-up, do not document the wrong behavior) |

Record the challenge verdict alongside the initial ranking. The final candidate list = initial candidates marked `keep` + those marked `downgrade` (with target ADR), minus those marked `drop`.

When agent is unavailable or times out, fall back to initial ranking with a `challenge_skipped: timeout` note in the summary.

## Step 7: Report Output

Write the report following ${CLAUDE_SKILL_DIR}/templates/report-template.md, substituting placeholders from findings. Add a per-file summary line `keep N / downgrade N / drop N`. If `--no-challenge` was set, omit the Challenge and Final columns and use the initial ranking. After writing, print a console summary: candidate count, ADR promotion candidate count.

```bash
mkdir -p docs/audit
STAMP=$(date -u +%Y-%m-%d-%H%M%S)  # UTC date + HHMMSS; same-day reruns never collide
REPORT="docs/audit/${STAMP}-adr-gaps.md"
```

## Hand-off

Print only the post-challenge `keep` candidates and offer to invoke `/adr` for each, or aggregate them into a single tracking issue via `/issue`. `downgrade` candidates are listed as comment-strengthening tasks (not ADRs). `drop` candidates are recorded in the report for traceability but not surfaced as follow-up. This skill only mines and nominates decisions: ADR drafting goes to `/adr`, drift scan against existing ADRs to `/adrift`, and code changes and README body updates are out of scope (extraction only). Cross-repo scope clusters use `scripts/audit-adr-scopes.py` directly (this skill is single-repo by design).

## Completion Criteria

Finish only when all of the following hold. Record the reason for any unmet item in the report.

| Item       | Condition                                                                  |
| ---------- | -------------------------------------------------------------------------- |
| Report     | `docs/audit/<YYYY-MM-DD>-<HHMMSS>-adr-gaps.md` exists                      |
| Large file | Every file exceeding threshold has a section                               |
| Document   | Every scanned document has an extraction section (or "no decisions found") |
| Tags       | Every candidate has impact + reversibility                                 |
| Candidates | ADR promotion candidates listed at the end with a one-line rationale       |
