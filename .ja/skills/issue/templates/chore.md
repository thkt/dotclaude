# Chore テンプレート

## 構造

```markdown
## What & Why

[行うべきメンテナンス作業]
[今やる理由 - リスク、技術的負債のコスト、他作業のブロッカー]

## Changes

- [具体的変更 1]
- [具体的変更 2]

## Scope

- In scope: [この issue がカバーするもの]
- Out of scope: [関連クリーンアップでここでは扱わないもの]

## Constraints (任意)

- [振る舞い変更なし、後方互換性など]
```

## ガイドライン

| フィールド  | OK                                                   | NG                           |
| ----------- | ---------------------------------------------------- | ---------------------------- |
| What & Why  | "Upgrade React 18→19, unblocks concurrent features" | "Upgrade React" (Why なし)   |
| Changes     | "Update package.json, fix breaking API calls"        | "Update dependencies" (曖昧) |
| Scope       | "Only React core, not React Router"                  | (省略)                       |
| Constraints | "No behavior changes to existing components"         | (スコープ不明確時に省略)     |
