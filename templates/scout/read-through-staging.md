# Read-through Staging Template

`scouting-anomalies` skillのstaging先。

## Base Fields

### {TIMESTAMP}-{seq}

| Field                 | Value                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| severity              | critical / high / medium / low                                           |
| evidence              | `file:line` + observation                                                |
| reasoning             | concrete language                                                        |
| existing-reviewer-fit | ID prefix 配列 (例: `[CQ, PQ]`)。該当なしは `[]`                       |
| category-in-reviewer  | 該当 reviewer の Category (例: `clarity`、`readability`)。該当なしは `none` |

## Calibration

Yes/YesのみSTAGE、それ以外SKIP。

| Filter          | Question                                                        |
| --------------- | --------------------------------------------------------------- |
| Senior Engineer | Would a senior engineer request a change?                       |
| Harm            | Concrete trigger for bug/data loss/security/maintenance burden? |

## Harvest Rules

| Trigger                                          | Action                                                         |
| ------------------------------------------------ | -------------------------------------------------------------- |
| existing-reviewer-fit に prefix を含む           | `calibration-examples.md` の該当 Category に REPORT 例追加を検討 |
| existing-reviewer-fit = `[]` が 3 監査連続で同種 | 新設 reviewer 候補 (手動判定)                                  |
| 単発 `[]`                                        | 累積のみ                                                       |

## Storage

実体: `$HOME/.claude/workspace/scout/staging.md`

## Entry Format

````markdown
### 2026-04-15T12:34:56Z-001

| Field                 | Value                                              |
| --------------------- | -------------------------------------------------- |
| severity              | medium                                             |
| evidence              | `src/foo.ts:42` — mutation of frozen config object |
| reasoning             | runtime TypeError when strict mode is enabled      |
| existing-reviewer-fit | [TS]                                               |
| category-in-reviewer  | assertion                                          |
````

## References

| File                               | Purpose                           |
| ---------------------------------- | --------------------------------- |
| `../audit/finding-schema.md`       | ID Prefix Registry, Language 規約 |
| `../audit/calibration-examples.md` | harvest 先 (REPORT/SKIP anchor)   |
