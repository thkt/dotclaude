# documenting-apisの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: API specification, endpoints, REST API, type definitions, OpenAPI, Swagger, API documentation, API仕様, エンドポイント, 型定義
- **コンテキスト**: APIドキュメント生成、エンドポイント分析、/docs:apiコマンド

## 評価シナリオ

### シナリオ1: REST APIエンドポイント検出

```json
{
  "skills": ["documenting-apis"],
  "query": "このプロジェクトのAPIエンドポイントをドキュメント化して",
  "files": ["src/api/"],
  "expected_behavior": [
    "スキルが'API'と'ドキュメント'でトリガーされる",
    "フレームワークを検出（Express/Fastify/Hono/Next.js）",
    "すべてのルート定義を抽出",
    "HTTPメソッドをドキュメント化（GET/POST/PUT/DELETE）",
    "パス付きのエンドポイントリストを生成"
  ]
}
```

### シナリオ2: 型定義抽出

```json
{
  "skills": ["documenting-apis"],
  "query": "APIのリクエスト/レスポンス型をドキュメント化したい",
  "files": ["src/types/api.ts"],
  "expected_behavior": [
    "スキルが'API'と'型'でトリガーされる",
    "TypeScriptインターフェースを抽出",
    "リクエストボディ型をドキュメント化",
    "レスポンス型をドキュメント化",
    "型の関係を示す"
  ]
}
```

### シナリオ3: OpenAPI生成

```json
{
  "skills": ["documenting-apis"],
  "query": "OpenAPI仕様書を自動生成したい",
  "files": ["src/"],
  "expected_behavior": [
    "スキルが'OpenAPI'でトリガーされる",
    "OpenAPI 3.0互換の出力を生成",
    "パス、メソッド、パラメータを含む",
    "リクエスト/レスポンススキーマをドキュメント化",
    "可能な場合は例を追加"
  ]
}
```

### シナリオ4: Next.js APIルート

```json
{
  "skills": ["documenting-apis"],
  "query": "Next.jsのAPIルートをドキュメント化して",
  "files": ["app/api/"],
  "expected_behavior": [
    "スキルが'Next.js'と'API'でトリガーされる",
    "app/api/ルート構造を検出",
    "route.tsハンドラを抽出",
    "動的ルートパラメータをドキュメント化",
    "ファイルベースのルーティング構造を示す"
  ]
}
```

### シナリオ5: 関数シグネチャドキュメント

```json
{
  "skills": ["documenting-apis"],
  "query": "ユーティリティ関数のAPIドキュメントを生成して",
  "files": ["src/utils/"],
  "expected_behavior": [
    "スキルが'API'と'関数'でトリガーされる",
    "関数シグネチャを抽出",
    "パラメータと戻り値の型をドキュメント化",
    "JSDoc/TSDocコメントを含む",
    "可能な場合は使用例を示す"
  ]
}
```

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがAPI関連キーワードで正しくトリガーされた
- [ ] フレームワークが正しく検出された
- [ ] すべてのエンドポイント/ルートが抽出された
- [ ] 型定義がドキュメント化された
- [ ] 出力形式が一貫していて使いやすい
- [ ] 正確な抽出のためtree-sitter-analyzerが使用された

## ベースライン比較

### スキルなし

- 手動のAPIドキュメント
- エンドポイントを見逃す可能性
- 形式が一貫しない
- 型抽出なし

### スキルあり

- 自動エンドポイント検出
- マルチフレームワークサポート（Express, Fastify, Next.js等）
- 型定義抽出
- OpenAPI互換出力
- 一貫したドキュメント形式
