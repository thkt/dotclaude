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

## Approach (任意)

- [仮の実装方針。確定要件ではなく出発点: "既存構成に合わせて OrderService 配下に配置 (仮: 着手時に判断)"]

## Constraints (任意)

- [技術的制約、禁止アプローチ、依存関係]
```

確定の項目 (ask, AC, 決定済みの制約) は無印、仮の項目 (AI が推論した HOW、未決定の判断) は `(仮: <着手時のアクション>)` を付け、実装者が着手時に変更できるようにする (Confidence Marking 参照)。

## ガイドライン

| フィールド          | OK                                               | NG                                |
| ------------------- | ------------------------------------------------ | --------------------------------- |
| What & Why          | "Add CSV export so users can analyze offline"    | "Add CSV export" (Why なし)       |
| Acceptance Criteria | "When user clicks Export, a .csv downloads"      | "CSV export works correctly"      |
| Scope - Out of      | "Excel format is out of scope"                   | (省略)                            |
| Approach            | "match OrderService structure; decide at pickup" | Inferred HOW を確定要件として書く |
| Constraints         | "Must not add new dependencies"                  | (既知の制約があるのに省略)        |
