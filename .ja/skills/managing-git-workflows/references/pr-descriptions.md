# PR説明

## テンプレート

```markdown
## Summary

- [1-3個の箇条書き]

## Changes

- [エリアごとにグループ化された主要な変更]

## Test Plan

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related

- Closes #123
```

## セクションガイド

| セクション | 内容                                           |
| ---------- | ---------------------------------------------- |
| Summary    | 解決した問題、アプローチ、決定事項             |
| Changes    | コンポーネントごとにグループ化、破壊的変更含む |
| Test Plan  | 自動+手動テスト、エッジケース                  |
| Related    | `Closes #123`, `Fixes #456`, `Related to #789` |

## 生成プロセス

```text
1. git log main..HEAD (コミット)
2. type/scopeでグループ化
3. diffから変更を抽出
4. サマリーを生成
5. テストチェックリストを作成
```

## Gitコマンド

```bash
git log main..HEAD --oneline      # コミット
git diff main...HEAD --stat       # サマリー
git diff main...HEAD              # 詳細
```

## Good vs Bad

| Good                 | Bad                   |
| -------------------- | --------------------- |
| 詳細な箇条書き       | "Added auth"          |
| グループ化された変更 | "stuff"               |
| テストチェックリスト | "works on my machine" |
