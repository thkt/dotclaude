<!-- /audit-adr-gaps Step 7 report skeleton. Placeholders substituted from findings. -->

# Undocumented Decisions Audit: <YYYY-MM-DD>-<HHMMSS>

## Summary

| Metric                   | Value |
| ------------------------ | ----- |
| Large files scanned      | N     |
| Documents scanned        | N     |
| Decision candidates      | N     |
| ADR-covered (excluded)   | N     |
| Net new candidates       | N     |
| ADR promotion candidates | N     |

## Large File Decisions

### src/foo.rs (NNN lines)

| #   | Line | Decision | Documented? | Incomplete-contract? | Impact | Reversibility |
| --- | ---- | -------- | ----------- | -------------------- | ------ | ------------- |
| 1   | 42   | ...      | Partial     | Yes                  | H      | low           |

## Prose Document Decisions

### README.md

| #   | Line | Decision Verb | Decision | ADR Coverage |
| --- | ---- | ------------- | -------- | ------------ |
| 1   | 12   | must not      | ...      | None         |

## ADR Promotion Candidates (post-challenge)

| #   | Candidate                       | Initial | Challenge | Final          |
| --- | ------------------------------- | ------- | --------- | -------------- |
| 1   | `<source>:<line>` - `<summary>` | promote | keep      | ADR            |
| 2   | `<source>:<line>` - `<summary>` | promote | downgrade | inline-comment |
| 3   | `<source>:<line>` - `<summary>` | promote | drop      | skip           |
