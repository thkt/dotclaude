# ADR Gaps Audit レポートテンプレート

/census Step 7 が出力するレポートの骨格。Large File Decisions は大型ファイルごと、Prose Document Decisions はドキュメントごとに `###` セクションを繰り返す。判断が無いファイル/ドキュメントは "no decisions found" と記録する。

## テンプレート

`{...}` は findings から置換する。enum セルは `/` 区切りの選択肢から該当値を選ぶ。ADR Promotion Candidates の 3 行は challenge 判定と Final の対応 (keep→ADR / downgrade→inline-comment / drop→skip) を示す例で、候補ごとに該当する 1 行を書く。

```markdown
# ADR Gaps Audit: {YYYY-MM-DD}-{HHMMSS}

## Summary

| Metric                   | Value |
| ------------------------ | ----- |
| Large files scanned      | {N}   |
| Documents scanned        | {N}   |
| Decision candidates      | {N}   |
| ADR-covered (excluded)   | {N}   |
| Net new candidates       | {N}   |
| ADR promotion candidates | {N}   |

## Large File Decisions

### {file} ({N} lines)

| #   | Line   | Decision  | Documented?        | Incomplete-contract? | Impact    | Reversibility       |
| --- | ------ | --------- | ------------------ | -------------------- | --------- | ------------------- |
| 1   | {line} | {summary} | Yes / Partial / No | Yes / No             | H / M / L | high / medium / low |

## Prose Document Decisions

### {file}

| #   | Line   | Decision Verb | Decision  | ADR Coverage    |
| --- | ------ | ------------- | --------- | --------------- |
| 1   | {line} | {verb}        | {summary} | None / ADR-{id} |

## ADR Promotion Candidates (post-challenge)

| #   | Candidate                   | Initial | Challenge | Final          |
| --- | --------------------------- | ------- | --------- | -------------- |
| 1   | {source}:{line} - {summary} | promote | keep      | ADR            |
| 2   | {source}:{line} - {summary} | promote | downgrade | inline-comment |
| 3   | {source}:{line} - {summary} | promote | drop      | skip           |
```
