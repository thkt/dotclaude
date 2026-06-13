# ADR Drift Scan Report Template

The skeleton that /adrift Step 8 emits. Repeat Per-ADR Findings for each ADR. Omit the External ADR Dependencies and Follow-up Issue Candidates headings entirely when there is nothing to report.

## Template

Substitute `{...}` from findings. For enum cells, pick the matching value from the `/`-separated choices.

```markdown
# ADR Drift Scan: {YYYY-MM-DD}-{HHMMSS}

## Summary

| Metric            | Value |
| ----------------- | ----- |
| ADRs scanned      | {N}   |
| Drift findings    | {N}   |
| H priority        | {N}   |
| M priority        | {N}   |
| L priority        | {N}   |
| Unverifiable ADRs | {N}   |

## Per-ADR Findings

### ADR {id}: {title}

Status: {Accepted / Superseded}

| #   | File:Line     | Description | Direction                      | Priority  |
| --- | ------------- | ----------- | ------------------------------ | --------- |
| 1   | {file}:{line} | {summary}   | code-fix / adr-update / accept | H / M / L |

## External ADR Dependencies

| #   | File:Line     | External ADR ref     | Recommended action                              |
| --- | ------------- | -------------------- | ----------------------------------------------- |
| 1   | {file}:{line} | ADR-NNNN (not local) | Promote to scout-local ADR or supersede locally |

## Follow-up Issue Candidates

- [ ] ADR {id} drift at {file}:{line}: {summary}
```
