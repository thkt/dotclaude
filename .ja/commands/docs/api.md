---
description: コードベース分析からAPI仕様ドキュメントを生成
aliases: [api-docs]
---

# /docs:api - API仕様生成

## 概要

コードベースを分析し、API仕様ドキュメントを自動生成。

## 使用方法

```bash
# カレントディレクトリを分析
/docs:api

# 特定ディレクトリを分析
/docs:api src/

# 出力先を指定
/docs:api --output docs/API.md
```

## オプション

| オプション | 説明 | デフォルト |
| --- | --- | --- |
| `path` | 分析対象ディレクトリ | カレントディレクトリ |
| `--output` | 出力ファイルパス | `.claude/workspace/docs/api-reference.md` |
| `--format` | 出力形式 | `markdown` |

## 生成コンテンツ

- **エンドポイント一覧** - HTTPメソッド、パス、ハンドラー情報
- **関数シグネチャ** - パラメータ、戻り値型
- **型定義** - Interface、Type、Zod/Pydanticスキーマ
- **リクエスト/レスポンス例** - サンプルJSON

## 検出対象

### Node.jsフレームワーク

| フレームワーク | 検出パターン |
| --- | --- |
| Express.js | `app.get()`、`router.post()`等 |
| Fastify | `fastify.get()`等 |
| Hono | `app.get()`等 |
| Next.js App Router | `app/api/**/route.ts` |
| Next.js Pages Router | `pages/api/**/*.ts` |

### Pythonフレームワーク

| フレームワーク | 検出パターン |
| --- | --- |
| Flask | `@app.route()`デコレーター |
| FastAPI | `@app.get()`デコレーター |
| Django REST | `@api_view`デコレーター |

### 型定義

| 種類 | 検出パターン |
| --- | --- |
| TypeScript | `interface`、`type` |
| Zod | `z.object()`スキーマ |
| Python dataclass | `@dataclass`デコレーター |
| Pydantic | `BaseModel`サブクラス |

### OpenAPI/Swagger

| ファイル | 検出内容 |
| --- | --- |
| openapi.yaml/json | OpenAPI 3.x仕様 |
| swagger.yaml/json | Swagger 2.x仕様 |

## 実行フロー

### フェーズ1: エンドポイント検出

```bash
~/.claude/skills/documenting-apis/scripts/detect-endpoints.sh {path}
```

### フェーズ2: 型定義抽出

```bash
~/.claude/skills/documenting-apis/scripts/extract-types.sh {path}
```

### フェーズ3: ドキュメント生成

検出結果をテンプレート（`~/.claude/skills/documenting-apis/assets/api-template.md`）に埋め込み、Markdownドキュメントを生成。

### フェーズ4: Markdownバリデーション

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

生成されたMarkdownのフォーマット問題を検証。ブロッキングなし（警告のみ）。

## 出力例

```markdown
# API仕様

## エンドポイント一覧

| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | /api/users | ユーザー一覧取得 |
| POST | /api/users | ユーザー作成 |
| GET | /api/users/:id | ユーザー詳細取得 |

## 型定義

### User
| フィールド | 型 | 説明 |
| --- | --- | --- |
| id | string | ユーザーID |
| name | string | ユーザー名 |
| email | string | メールアドレス |
```

## エラーハンドリング

| エラー | アクション |
| --- | --- |
| エンドポイント未検出 | サポート対象フレームワーク一覧を表示 |
| tree-sitter-analyzer未インストール | Grepにフォールバック |
| OpenAPI仕様なし | コードベースから推論 |

## 関連

- **関連コマンド**: `/docs:architecture`、`/docs:setup`
