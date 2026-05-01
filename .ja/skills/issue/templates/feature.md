# Feature テンプレート

## 構造

```markdown
## What & Why

[作るもの - 1-2 文]
[なぜ必要か - ユーザー問題やビジネス理由]

## Acceptance Criteria

- [ ] [When X, then Y happens]
- [ ] [When X, then Y happens]

## Scope

- In scope: [この issue がカバーするもの]
- Out of scope: [この issue で明示的に除外するもの]

## Constraints (任意)

- [技術的制約、禁止アプローチ、依存関係]
```

## ガイドライン

| フィールド          | OK                                            | NG                           |
| ------------------- | --------------------------------------------- | ---------------------------- |
| What & Why          | "Add CSV export so users can analyze offline" | "Add CSV export" (Why なし)  |
| Acceptance Criteria | "When user clicks Export, a .csv downloads"   | "CSV export works correctly" |
| Scope - Out of      | "Excel format is out of scope"                | (省略)                       |
| Constraints         | "Must not add new dependencies"               | (既知の制約があるのに省略)   |
