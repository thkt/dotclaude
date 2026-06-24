# ADR Drift Scan レポートテンプレート

/adrift Step 8 が出力するレポートの骨格。Per-ADR Findings は ADR ごとに繰り返す。External ADR Dependencies と Follow-up Issue Candidates は該当が無ければ見出しごと省略する。

## テンプレート

`{...}` は findings から置換する。enum セルは `/` 区切りの選択肢から該当値を選ぶ。

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

| #   | File:Line     | 説明      | Direction                      | Priority  |
| --- | ------------- | --------- | ------------------------------ | --------- |
| 1   | {file}:{line} | {summary} | code-fix / adr-update / accept | H / M / L |

## External ADR Dependencies

| #   | File:Line     | External ADR ref     | Recommended action                        |
| --- | ------------- | -------------------- | ----------------------------------------- |
| 1   | {file}:{line} | ADR-NNNN (not local) | scout-local ADR に昇格 or local supersede |

## Follow-up Issue Candidates

- [ ] ADR {id} drift at {file}:{line}: {summary}
```
