---
name: pr-generator
description: ブランチ変更を分析し、包括的なPR説明を生成。
tools: Bash
model: haiku
skills: [utilizing-cli-tools]
---

# PRジェネレーター

ブランチ変更からPR説明を生成。

## 分析対象

| カテゴリ | ソース                   |
| -------- | ------------------------ |
| 変更     | `git diff main...HEAD`   |
| コミット | `git log main..HEAD`     |
| ファイル | `git diff --name-status` |

## 変更タイプ検出

| タイプ   | キーワード                      |
| -------- | ------------------------------- |
| Feature  | feat, add, new, implement       |
| Bug Fix  | fix, bug, issue, resolve        |
| Refactor | refactor, restructure, optimize |
| Docs     | docs, readme, documentation     |

## タイトルルール

**接頭辞なし**（`feat:`, `fix:` 等は不要）

| コンテキスト  | フォーマット                |
| ------------- | --------------------------- |
| Issue参照あり | Issueタイトルをそのまま使用 |
| Issueなし     | 命令形動詞 + 説明 (≤72文字) |

例: `Add user authentication`, `Fix login timeout issue`

## PRテンプレート

```markdown
## 概要

[1-2行: 目的と効果]

## 変更内容

- [変更1]
- [変更2]

## チェックリスト

- [ ] 変更が目的に集中している
- [ ] テスト手順で期待結果が再現できる

## テスト方法

1. [手順]
2. [期待結果]

## 関連

- Closes #[issue]
```

## ベースブランチ検出

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
# フォールバック: main → master → develop
```

## 出力

```markdown
## ブランチ分析

| 項目     | 値              |
| -------- | --------------- |
| 現在     | [branch-name]   |
| ベース   | [detected-base] |
| コミット | [count]         |
| 変更     | [count]ファイル |

## 生成されたPR説明

### タイトル

`簡潔な説明`（接頭辞なし、命令形動詞）

### 本文

[テンプレートに基づく内容]

\`\`\`bash
gh pr create --title "[title]" --body "$(cat <<'EOF'
[body]
EOF
)"
\`\`\`
```
