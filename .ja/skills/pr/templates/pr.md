# PR テンプレート

## 構造

```markdown
Preview URL: http://localhost:3000

## What & Why

[この PR が何をするか - 1-2 文]
[Why - どの問題を解決するか、何を可能にするか]

## Changes

- [変更 1: 何を行いなぜか]
- [変更 2: 何を行いなぜか]

## Scope (任意)

- Not included: [この PR が意図的に行わないもの]

## Design Decisions

- [このアプローチを代替肢より選んだ理由]

## How to Test

1. [Step]
2. [Expected result]

## Related

- Closes #[issue]
```

`Preview URL:` は UI 変更がある PR にのみ必要 (use-workflow-pageshot が読む)。UI 変更なしなら省略。

## ガイドライン

| フィールド       | OK                                                  | NG                                         |
| ---------------- | --------------------------------------------------- | ------------------------------------------ |
| What & Why       | "Add CSV export to unblock offline analysis"        | "Add CSV export feature" (Why なし)        |
| Changes          | "Add ExportButton - chosen over menu for 1-click"   | "Added files" (理由なし)                   |
| Scope            | "Auth token refresh is not included (separate PR)"  | (大きな PR で省略 - reviewer が境界を推測) |
| Design Decisions | "Used streaming to avoid OOM on large datasets"     | (省略 - reviewer が理由推測を強いられる)   |
| How to Test      | "Click Export → verify .csv downloads with 3 rows" | "Test the feature" (曖昧)                  |
| Preview URL      | "Preview URL: http://localhost:3000/dashboard"      | (UI 変更があるのに欠落)                    |
