# Docs テンプレート

## 構造

```markdown
## What & Why

[追加または変更が必要なドキュメント]
[Why - これがないと読者が直面する問題は何か]

## Location

[変更するファイルパスまたはセクション]

## Changes

- [具体的変更 1]
- [具体的変更 2]

## Scope

- In scope: [この issue がカバーするもの]
- Out of scope: [関連 docs でここでは扱わないもの]
```

## ガイドライン

| フィールド | OK                                                      | NG                           |
| ---------- | ------------------------------------------------------- | ---------------------------- |
| What & Why | "Add setup guide - new contributors can't onboard"      | "Add setup guide" (Why なし) |
| Location   | "`docs/getting-started.md`, Setup section"              | "Somewhere in docs" (曖昧)   |
| Changes    | "Add prerequisites list, install steps, verify command" | "Write setup documentation"  |
| Scope      | "Only local dev setup, not CI/CD"                       | (省略)                       |
