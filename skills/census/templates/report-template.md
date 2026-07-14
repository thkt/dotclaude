# ADR Gaps Audit Report Template

The skeleton that `/census` Phase 6 emits. Repeat the Source File Decisions `###` section per source file and the Prose Document Decisions `###` section per document. Batch source files with no decisions into one trailing line. Record a document with no decisions as `no decisions found` under its `###`.

## Template

Substitute `{...}` from findings. For enum cells, pick the matching value from the `/`-separated choices. The three ADR Promotion Candidates rows show the challenge-verdict to Final mapping: keep is ADR, downgrade is inline-comment, drop is skip. Write the one matching row per candidate.

```markdown
# ADR Gaps Audit: {YYYY-MM-DD}-{HHMMSS}

## Summary

| Metric                   | Value         |
| ------------------------ | ------------- |
| Scope                    | {repo / path} |
| Source files scanned     | {N}           |
| Documents scanned        | {N}           |
| Decision candidates      | {N}           |
| ADR-covered (excluded)   | {N}           |
| Net new candidates       | {N}           |
| ADR promotion candidates | {N}           |

## Source File Decisions

<!-- Add a ### only for files with decisions. Batch files with none into one trailing line. -->

### {file} ({N} lines)

| #   | Line   | Decision  | Documented?        | Incomplete-contract? | Impact    | Reversibility       |
| --- | ------ | --------- | ------------------ | -------------------- | --------- | ------------------- |
| 1   | {line} | {summary} | Yes / Partial / No | Yes / No             | H / M / L | high / medium / low |

No net-new decisions in {files}.

## Prose Document Decisions

### {file}

| #   | Line   | Decision Verb | Decision  | ADR Coverage    | Impact    | Reversibility       |
| --- | ------ | ------------- | --------- | --------------- | --------- | ------------------- |
| 1   | {line} | {verb}        | {summary} | None / ADR-{id} | H / M / L | high / medium / low |

## ADR Promotion Candidates (post-challenge)

| #   | Candidate                   | Initial | Challenge | Final          |
| --- | --------------------------- | ------- | --------- | -------------- |
| 1   | {source}:{line} - {summary} | promote | keep      | ADR            |
| 2   | {source}:{line} - {summary} | promote | downgrade | inline-comment |
| 3   | {source}:{line} - {summary} | promote | drop      | skip           |

keep {N} / downgrade {N} / drop {N}
```
