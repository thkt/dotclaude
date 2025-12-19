# Evaluations for documenting-apis

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: API specification, endpoints, REST API, type definitions, OpenAPI, Swagger, API documentation, API仕様, エンドポイント, 型定義
- **Contexts**: API documentation generation, endpoint analysis, /docs:api command

## Evaluation Scenarios

### Scenario 1: REST API Endpoint Detection

```json
{
  "skills": ["documenting-apis"],
  "query": "このプロジェクトのAPIエンドポイントをドキュメント化して",
  "files": ["src/api/"],
  "expected_behavior": [
    "Skill is triggered by 'API' and 'ドキュメント'",
    "Detects framework (Express/Fastify/Hono/Next.js)",
    "Extracts all route definitions",
    "Documents HTTP methods (GET/POST/PUT/DELETE)",
    "Generates endpoint list with paths"
  ]
}
```

### Scenario 2: Type Definition Extraction

```json
{
  "skills": ["documenting-apis"],
  "query": "APIのリクエスト/レスポンス型をドキュメント化したい",
  "files": ["src/types/api.ts"],
  "expected_behavior": [
    "Skill is triggered by 'API' and '型'",
    "Extracts TypeScript interfaces",
    "Documents request body types",
    "Documents response types",
    "Shows type relationships"
  ]
}
```

### Scenario 3: OpenAPI Generation

```json
{
  "skills": ["documenting-apis"],
  "query": "OpenAPI仕様書を自動生成したい",
  "files": ["src/"],
  "expected_behavior": [
    "Skill is triggered by 'OpenAPI'",
    "Generates OpenAPI 3.0 compatible output",
    "Includes paths, methods, parameters",
    "Documents request/response schemas",
    "Adds examples where available"
  ]
}
```

### Scenario 4: Next.js API Routes

```json
{
  "skills": ["documenting-apis"],
  "query": "Next.jsのAPIルートをドキュメント化して",
  "files": ["app/api/"],
  "expected_behavior": [
    "Skill is triggered by 'Next.js' and 'API'",
    "Detects app/api/ route structure",
    "Extracts route.ts handlers",
    "Documents dynamic route parameters",
    "Shows file-based routing structure"
  ]
}
```

### Scenario 5: Function Signature Documentation

```json
{
  "skills": ["documenting-apis"],
  "query": "ユーティリティ関数のAPIドキュメントを生成して",
  "files": ["src/utils/"],
  "expected_behavior": [
    "Skill is triggered by 'API' and '関数'",
    "Extracts function signatures",
    "Documents parameters and return types",
    "Includes JSDoc/TSDoc comments",
    "Shows usage examples if available"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by API-related keywords
- [ ] Framework was correctly detected
- [ ] All endpoints/routes were extracted
- [ ] Type definitions were documented
- [ ] Output format was consistent and usable
- [ ] tree-sitter-analyzer was used for precise extraction

## Baseline Comparison

### Without Skill

- Manual API documentation
- May miss endpoints
- Inconsistent format
- No type extraction

### With Skill

- Automatic endpoint detection
- Multi-framework support (Express, Fastify, Next.js, etc.)
- Type definition extraction
- OpenAPI-compatible output
- Consistent documentation format
