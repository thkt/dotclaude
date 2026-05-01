# バグレポートテンプレート

## 構造

```markdown
## What & Why

[何が壊れているか - 1 文]
[ユーザー影響 - なぜ重要か]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected vs Actual

- Expected: [具体的な値や振る舞い]
- Actual: [エラーメッセージや実際の値]

## Scope

- In scope: [この issue が修正するもの]
- Out of scope: [関連するがここでは扱わないもの]

## Constraints (任意)

- [修正の制約: 破壊的変更なし、対症療法でなく根本原因など]

## Environment (任意)

- Browser/OS: [例: Chrome 120 / macOS 14]
- Version: [例: v1.2.3]
```

## ガイドライン

| フィールド         | OK                                         | NG                           |
| ------------------ | ------------------------------------------ | ---------------------------- |
| What & Why         | "Login fails, blocking 30% of users"       | "Login is broken"            |
| Expected vs Actual | "Expected: 200 OK / Actual: 500 with ESQL" | "Works correctly" (曖昧)     |
| Scope - Out of     | "Auth refactor is out of scope"            | (省略)                       |
| Constraints        | "Fix root cause, not workaround"           | (修正がリスキーなときに省略) |
