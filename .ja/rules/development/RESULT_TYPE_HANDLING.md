# Result型によるエラーハンドリング

**基本原則**: 型システムとLintでエラーハンドリング要件を明示的にする

## 基本哲学

エラーハンドリングの漏れはフロントエンド開発で最も多いバグの一つ。コードレビューや人間の注意力に頼るのではなく、**型システムと静的解析で強制する**。

参考: [Result型とESLintでエラーハンドリング漏れを検出する](https://zenn.dev/knowledgework/articles/7ff389c5fe8f06)

## Result型パターン

### 3パターン分類

| 型 | 意味 | 呼び出し側の責任 |
| --- | --- | --- |
| `Ok<T>` | 成功 | 値を使用 |
| `Err<Error>` | 失敗 - ハンドリング必須 | **明示的に処理必須** |
| `Err<null>` | 失敗 - 内部処理済み | 処理は任意 |

### 実装例

```typescript
// 型定義
type Ok<T> = { ok: true; value: T }
type Err<E> = { ok: false; error: E }
type Result<T, E> = Ok<T> | Err<E>

// ヘルパー関数
const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
const err = <E>(error: E): Err<E> => ({ ok: false, error })
```

### 使用パターン

```typescript
// Usecaseレイヤーの返り値にResult型
async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const user = await api.getUser(id)
    return ok(user)
  } catch (e) {
    return err(new ApiError('Failed to fetch user', e))
  }
}

// 呼び出し側はエラーをハンドリング必須
const result = await fetchUser(userId)
if (!result.ok) {
  // ESLintがこのブロックの存在を強制
  showErrorToast(result.error.message)
  return
}
// result.valueは安全にUser型として扱える
```

## Lintによる強制

### ESLint設定

`eslint-plugin-return-type`を使用:

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['return-type'],
  rules: {
    'return-type/enforce-access': ['error', {
      // アクセス必須の型パターン（正規表現）
      targetTypePattern: 'Err<(?!null)[^>]+>',
      // アクセス要件を満たすプロパティ
      accessProperties: ['error', 'ok']
    }]
  }
}
```

### Biome設定

Biomeには直接的な同等機能がないため、代替アプローチ:

```jsonc
// biome.json
{
  "linter": {
    "rules": {
      "suspicious": {
        // 未使用変数の検出（未処理のResultも含む）
        "noUnusedVariables": "error"
      },
      "correctness": {
        // 浮いているPromiseの検出
        "noVoid": "error"
      }
    }
  }
}
```

**注意**: BiomeでResult型の完全な強制には以下を検討:

1. カスタムLintルール（Biomeがサポートする場合）
2. TypeScript strictモードと網羅性チェック
3. `@typescript-eslint/no-floating-promises`との併用

### TypeScript Strictアプローチ

カスタムLintルールなしの場合、TypeScriptの型システムを活用:

```typescript
// never型で網羅的ハンドリングを強制
function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + x)
}

function handleResult<T>(result: Result<T, Error>): T {
  if (result.ok) {
    return result.value
  }
  // エラーケースの処理必須 - TypeScriptが強制
  throw result.error
}
```

## Error Boundaryとの統合

### React Error Boundaryパターン

```tsx
// Result型はError Boundaryと相性が良い
function UserProfile({ userId }: { userId: string }) {
  const result = useUserQuery(userId)

  if (!result.ok) {
    // 明示的なエラーハンドリング - サイレントではない
    return <ErrorDisplay error={result.error} />
  }

  return <ProfileCard user={result.value} />
}
```

## 適用タイミング

| シナリオ | アプローチ |
| --- | --- |
| API呼び出し | 常にResult型を使用 |
| フォームバリデーション | バリデーションエラー付きResult |
| ファイル操作 | IOエラー付きResult |
| 内部ユーティリティ | シンプルなthrow/catchで十分な場合も |

## メリット

1. **コンパイル時の安全性**: エラーを忘れることができない
2. **自己文書化**: 返り値の型がエラー可能性を示す
3. **明示的ハンドリング**: 呼び出し側でtry-catchが不要
4. **テスト可能**: エラーパスがファーストクラス

## プロジェクト固有設定

各プロジェクトで定義すべき項目:

1. **Result型の場所**: 型定義の配置場所
2. **Lintツール**: ESLint、Biome、またはTypeScriptのみ
3. **強制レベル**: Warning vs Error
4. **除外パターン**: 内部ユーティリティ、テスト等

プロジェクト設定例 (`.claude/rules/error-handling.md`):

```markdown
## エラーハンドリングルール

- Result型: `@/types/result`
- Linter: ESLint + `eslint-plugin-return-type`
- 適用レイヤー: UsecaseとAPIレイヤーのみ
- 除外: 内部ヘルパー、テストユーティリティ
```

## 関連原則

- [@./COMPLETION_CRITERIA.md](./COMPLETION_CRITERIA.md) - 品質ゲートにエラーハンドリングを含む
- [@../../agents/reviewers/silent-failure.md](../../agents/reviewers/silent-failure.md) - サイレントエラーの検出
- [@../../skills/reviewing-silent-failures/SKILL.md](../../skills/reviewing-silent-failures/SKILL.md) - サイレントエラーパターン
