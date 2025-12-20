---
description: コードベース解析によるAPI仕様ドキュメントを自動生成
aliases: [api-docs]
---

# /docs:api - API仕様ドキュメント生成

## 概要

コードベースを解析し、API仕様ドキュメントを自動生成します。

## 使用方法

```bash
# 現在のディレクトリを解析
/docs:api

# 特定のディレクトリを解析
/docs:api src/

# 出力先を指定
/docs:api --output docs/API.md
```

## オプション

| オプション | 説明 | デフォルト |
|-----------|------|----------|
| `path` | 解析対象ディレクトリ | カレントディレクトリ |
| `--output` | 出力ファイルパス | `.claude/workspace/docs/api.md` |
| `--format` | 出力形式 | `markdown` |

## 生成内容

- **エンドポイント一覧** - ルーティング情報
- **リクエスト/レスポンス型** - TypeScript型定義から抽出
- **認証情報** - 認証要件
- **エラーレスポンス** - エラーハンドリング

## 実行フロー

### フェーズ1: エンドポイント検出

```bash
~/.claude/skills/documenting-apis/scripts/detect-endpoints.sh {path}
```

### フェーズ2: 型情報抽出

```bash
~/.claude/skills/documenting-apis/scripts/extract-types.sh {path}
```

### フェーズ3: ドキュメント生成

テンプレート（`~/.claude/skills/documenting-apis/assets/api-template.md`）に
解析結果を埋め込み、Markdownドキュメントを生成。

## 出力例

```markdown
# プロジェクト名 - API仕様

## エンドポイント

### GET /api/users
ユーザー一覧を取得

**リクエスト**
- Query: `page`, `limit`

**レスポンス**
\`\`\`typescript
interface UserListResponse {
  users: User[];
  total: number;
}
\`\`\`
```

## エラーハンドリング

| エラー | 対処 |
|-------|------|
| エンドポイント未検出 | 警告を表示して続行 |
| 型情報抽出失敗 | フォールバック解析を実行 |

## 関連

- **兄弟コマンド**: `/docs:architecture`, `/docs:setup`, `/docs:domain`
