# Issueテンプレート

## バグレポートテンプレート

```markdown
## Description

[明確な説明]

## Steps to Reproduce

1. [ステップ1] 2. [ステップ2]

## Expected vs Actual

- Expected: [期待される動作]
- Actual: [実際の動作]

## Environment

OS: [macOS 14.0] | Browser: [Chrome 120] | Version: [v1.2.3]
```

## 機能リクエストテンプレート

```markdown
## Summary

[簡潔な説明]

## Problem

[どんな問題を解決する？]

## Proposed Solution

[どう動作すべき？]
```

## タスクテンプレート

```markdown
## Description

[何をする必要があるか]

## Acceptance Criteria

- [ ] [基準1]
- [ ] [基準2]
```

## ラベル

| タイプ  | ラベル                   |
| ------- | ------------------------ |
| Bug     | `bug`, `priority:*`      |
| Feature | `enhancement`, `feature` |
| Task    | `task`, `chore`          |

| 優先度              | 意味       |
| ------------------- | ---------- |
| `priority:critical` | 本番ダウン |
| `priority:high`     | 重大な影響 |
| `priority:medium`   | 通常       |
| `priority:low`      | あれば良い |

## gh CLI

```bash
gh issue create --title "Title" --body "Body"
gh issue create --label "bug,priority:high"
```
