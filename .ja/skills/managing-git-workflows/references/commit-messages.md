# Conventional Commits

## フォーマット

```text
<type>(<scope>): <subject>
[optional body]
[optional footer]
```

## タイプ

| タイプ     | ユースケース   | Semantic |
| ---------- | -------------- | -------- |
| `feat`     | 新機能         | MINOR    |
| `fix`      | バグ修正       | PATCH    |
| `docs`     | ドキュメント   | -        |
| `style`    | フォーマット   | -        |
| `refactor` | 再構成         | -        |
| `perf`     | パフォーマンス | PATCH    |
| `test`     | テスト         | -        |
| `chore`    | メンテナンス   | -        |

## サブジェクトルール

| ルール         | 例                               |
| -------------- | -------------------------------- |
| 72文字以内     | ✓                                |
| 命令形         | "add" not "added"                |
| type後は小文字 | `feat: add` not `feat: Add`      |
| ピリオドなし   | `feat: add X` not `feat: add X.` |

## 例

```text
# Good
feat(auth): add OAuth2 authentication support
fix(api): resolve timeout in user endpoint

# Bad
Fixed bug          # typeなし、曖昧
feat: Added new.   # 大文字、ピリオド
```

## 破壊的変更

```text
feat(api)!: remove deprecated endpoints

BREAKING CHANGE: /v1/users removed. Use /v2/users.
```

## Body

- 72文字で折り返し
- "what"と"why"を説明
- 参照: `Fixes #123`, `Closes #456`

## HEREDOC

```bash
git commit -m "$(cat <<'EOF'
feat(workflow): implement test runner

Multi-line description here.
EOF
)"
```
