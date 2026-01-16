# ブランチ命名

## フォーマット

```text
<type>/<ticket>-<description>
# またはチケットなし
<type>/<description>
```

## タイプ

| タイプ     | 目的         | 例                         |
| ---------- | ------------ | -------------------------- |
| `feat`     | 新機能       | feat/AUTH-123-oauth-login  |
| `fix`      | バグ修正     | fix/BUG-456-null-pointer   |
| `refactor` | コード再構成 | refactor/TECH-789-cleanup  |
| `docs`     | ドキュメント | docs/DOC-101-api-reference |
| `test`     | テスト変更   | test/integration-suite     |
| `chore`    | メンテナンス | chore/update-deps          |

## ルール

| Do                 | Don't                   |
| ------------------ | ----------------------- |
| 小文字を使用       | スペース/アンダースコア |
| ハイフンで区切る   | CamelCase/PascalCase    |
| 簡潔に（2-4単語）  | 曖昧な名前（"update"）  |
| チケットIDを含める | 日付を含める            |

## 検出ロジック

1. `git diff` を分析 → type
2. 影響を受けるコンポーネントを特定 → scope
3. 主要なアクションを抽出 → description
4. フォーマット: `type/scope-description`
