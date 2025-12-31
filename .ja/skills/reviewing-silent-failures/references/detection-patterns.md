# 検出パターン - サイレント障害の発見

## 検索コマンド

コードベースでサイレント障害パターンを見つけるためのコマンド。

### 空のcatchブロック

```bash
# 完全に空のcatch
rg "catch\s*\([^)]*\)\s*\{\s*\}" --glob "*.{ts,tsx,js,jsx}"

# コメントのみのcatch
rg "catch\s*\([^)]*\)\s*\{\s*//.*\s*\}" --glob "*.{ts,tsx,js,jsx}"

# ブロックコメントのみのcatch
rg "catch\s*\([^)]*\)\s*\{\s*/\*.*\*/\s*\}" --glob "*.{ts,tsx,js,jsx}"
```

### エラーハンドリングのないPromise

```bash
# .catch()のない.then()
rg "\.then\([^)]+\)$" --glob "*.{ts,tsx,js,jsx}"

# 最終.catch()のない複数の.then()
rg "\.then\([^)]+\)\s*\.then" --glob "*.{ts,tsx,js,jsx}"
```

### Consoleのみのエラーハンドリング

```bash
# console.logのみのcatchブロック
rg "catch.*console\.(log|error|warn)" --glob "*.{ts,tsx,js,jsx}"
```

### Fire and Forget

```bash
# awaitや.thenのない非同期関数呼び出し
rg "^\s*[a-zA-Z]+Async\(" --glob "*.{ts,tsx,js,jsx}"

# 一般的なパターン
rg "(fetch|axios|api)\([^)]+\)$" --glob "*.{ts,tsx,js,jsx}"
```

## パターン例

### 空のcatchのバリエーション

```typescript
// Bad: 完全に空
try { await risky() } catch (e) { }

// Bad: コメントのみ（TODOは永遠に完了しない）
try { await risky() } catch (error) {
  // TODO: エラーハンドリング
}

// Bad: アンダースコアでもOKではない
try { await risky() } catch (_) { }

// Bad: ログのみで未処理
try { await risky() } catch (error) {
  console.log(error)
}
```

### Catchのないプロミスチェーン

```typescript
// Bad: エラーハンドリングなし
fetchUser(id).then(user => setUser(user))

// Bad: 複数のthen、catchなし
fetchUser(id)
  .then(user => user.profile)
  .then(profile => setProfile(profile))

// Good: エラーハンドリングあり
fetchUser(id)
  .then(user => setUser(user))
  .catch(error => handleError(error))
```

### Try-CatchのないAsync/Await

```typescript
// Bad: エラーハンドリングなし
async function loadData() {
  const data = await fetchData() // これがスローすると、関数がスローする
  return processData(data)
}

// Good: エラーハンドリングあり
async function loadData() {
  try {
    const data = await fetchData()
    return processData(data)
  } catch (error) {
    logger.error('データの読み込みに失敗', error)
    throw new DataLoadError('データの読み込みに失敗', { cause: error })
  }
}
```

## 重大度分類

| パターン | 重大度 | アクション |
| --- | --- | --- |
| 空のcatchブロック | 🔴 クリティカル | 即座に修正が必要 |
| catchのないPromise | 🔴 クリティカル | エラーハンドリングを追加 |
| Console.logのみ | 🟡 高 | ユーザーフィードバックを追加 |
| Fire and forget | 🟡 高 | awaitまたは.catchを追加 |
| Error Boundaryの欠落 | 🟡 高 | 主要セクションをラップ |

## 自動検出

ESLintルールの追加を検討:

```json
{
  "rules": {
    "no-empty": ["error", { "allowEmptyCatch": false }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```
