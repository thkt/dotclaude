---
name: docs:api
description: >
  Generate API specification documentation from codebase analysis.
  Detects REST endpoints, function signatures, type definitions, and schemas.
  コードベースからAPI仕様ドキュメントを生成します。
  RESTエンドポイント、関数シグネチャ、型定義、スキーマを検出します。
allowed-tools: Read, Write, Grep, Glob, Bash, Task

triggers:
  keywords:
    - "API仕様"
    - "API specification"
    - "エンドポイント"
    - "endpoints"
    - "REST API"
    - "型定義"
    - "type definitions"
---

# docs:api スキル

API仕様ドキュメントを自動生成するスキル。

## 機能

### 検出項目

1. **REST APIエンドポイント**
   - Express.js: `app.get()`, `router.post()` など
   - Fastify: `fastify.get()` など
   - Hono: `app.get()` など
   - Next.js: `app/api/**/route.ts`, `pages/api/**/*.ts`
   - Flask: `@app.route()` デコレータ
   - FastAPI: `@app.get()` デコレータ
   - Django REST: `@api_view` デコレータ

2. **関数シグネチャ**
   - tree-sitter-analyzerによる関数定義抽出
   - TypeScript型注釈
   - JSDocコメント
   - Python docstrings

3. **型定義**
   - TypeScript: interface, type
   - Zod: z.object() スキーマ
   - Yup: yup.object() スキーマ
   - Python: dataclass, TypedDict, Pydantic

4. **OpenAPI/Swagger**
   - openapi.yaml, swagger.yaml
   - openapi.json, swagger.json

## 解析スクリプト

### detect-endpoints.sh

APIエンドポイントを検出：

```bash
~/.claude/skills/docs-api/scripts/detect-endpoints.sh {path}
```

**出力:**

- HTTPメソッド
- エンドポイントパス
- ハンドラ関数名
- ファイル位置

### extract-types.sh

型定義を抽出：

```bash
~/.claude/skills/docs-api/scripts/extract-types.sh {path}
```

**出力:**

- 型名
- フィールド定義
- 関連する型

## 生成ドキュメント構成

```markdown
# API仕様

## 概要
- ベースURL
- 認証方式
- レスポンス形式

## エンドポイント一覧

### GET /api/users
**説明**: ユーザー一覧を取得

**リクエスト**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| page | number | No | ページ番号 |

**レスポンス**:
\`\`\`json
{
  "users": [...]
}
\`\`\`

## 型定義

### User
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | ユーザーID |
| name | string | ユーザー名 |
```

## テンプレート

`assets/api-template.md` - API仕様のMarkdownテンプレート

## 使用例

```bash
# コマンドから呼び出し
/docs:api

# スキル直接参照
「API仕様を生成して」
```

## 関連

- 兄弟スキル: `docs:architecture`, `docs:setup`
- コマンド: `/docs:api`
