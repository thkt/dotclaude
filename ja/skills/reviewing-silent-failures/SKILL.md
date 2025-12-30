---
name: reviewing-silent-failures
description: >
  フロントエンドコードのサイレント障害検出パターン。
  Triggers: サイレント障害, silent failure, 空のcatch, empty catch,
  未処理Promise, unhandled rejection, unhandled promise, Error Boundary,
  fire and forget, エラーハンドリング, error handling, try-catch.
allowed-tools: Read, Grep, Glob, Task
---

# サイレント障害レビュー - エラーの可視化とハンドリング

目標: すべての障害が可視化され、デバッグ可能で、ユーザーに通知される。

## サイレント障害のリスクレベル

| パターン | リスク | 影響 |
| --- | --- | --- |
| 空のcatchブロック | 🔴 Critical | エラーが完全に隠される |
| catchなしのPromise | 🔴 Critical | 未処理のrejection |
| Fire and forget async | 🟡 High | エラーコンテキストの損失 |
| Console.logのみ | 🟡 High | ユーザーへのフィードバックなし |
| Error Boundaryの欠落 | 🟡 High | コンポーネントエラーでアプリがクラッシュ |
| 過度なオプショナルチェイン | 🟢 Medium | バグを隠す可能性 |

## セクション別ロード

| セクション | ファイル | フォーカス | トリガー |
| --- | --- | --- | --- |
| 検出 | `references/detection-patterns.md` | 正規表現パターン、検索コマンド | 空のcatch, empty catch |
| ハンドリング | `references/error-handling.md` | 適切なエラーハンドリングパターン | エラーハンドリング |
| Boundary | `references/error-boundaries.md` | React Error Boundary | Error Boundary |

## クイックチェックリスト

### Critical（必須対応）

- [ ] 空のcatchブロックがない
- [ ] すべてのPromiseにエラーハンドリングがある（`.catch`または`try-catch`）
- [ ] `console.log`のみのエラーハンドリングがない
- [ ] イベントハンドラでエラーを握りつぶしていない

### High Priority

- [ ] 主要セクションにError Boundaryがある
- [ ] useEffect内のasync操作にエラーハンドリングがある
- [ ] API呼び出しに適切なエラー状態がある
- [ ] フォーム送信が失敗を処理する

### ベストプラクティス

- [ ] エラーがコンテキスト付きでログされる（ユーザーID、アクション等）
- [ ] 障害時にユーザー向けエラーメッセージがある
- [ ] オプショナルチェインが防御的ではなく意図的に使用されている
- [ ] 一時的な障害にリトライロジックがある

## キー原則

| 原則 | 適用 |
| --- | --- |
| Fail Fast | 障害を可視化し即座に検知 |
| ユーザーフィードバック | 常にユーザーに障害を通知 |
| コンテキストログ | デバッグに十分な情報をログ |
| グレースフルデグラデーション | 静かにではなく優雅に失敗 |

## 検出コマンド

```bash
# 空のcatchブロック
rg "catch\s*\([^)]*\)\s*\{\s*\}" --glob "*.{ts,tsx}"

# catchなしのthen
rg "\.then\([^)]+\)$" --glob "*.{ts,tsx}"

# console.logのみのエラーハンドリング
rg "catch.*console\.log" --glob "*.{ts,tsx}"
```

## よくあるパターン

### 空のcatch → 適切なハンドリング

```typescript
// Bad: サイレント障害
try {
  await fetchUserData()
} catch (e) {
  // ここに何もない - エラーが消える
}

// Good: 適切なハンドリング
try {
  await fetchUserData()
} catch (error) {
  logger.error('Failed to fetch user data', { error })
  setError('データの読み込みに失敗しました。再試行してください。')
}
```

### Promiseチェイン → エラーハンドリング

```typescript
// Bad: 未処理のrejection
fetchData().then(data => setData(data))

// Good: エラーハンドリング付き
fetchData()
  .then(data => setData(data))
  .catch(error => {
    logger.error('Failed to fetch data', error)
    setError('読み込みに失敗しました')
  })
```

## 参照

### コア原則

- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](../../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - グレースフルデグラデーション

### 関連スキル

- `reviewing-type-safety` - 型安全性は一部のエラーをコンパイル時にキャッチ
- `generating-tdd-tests` - エラーパスのテスト

### 使用するエージェント

- `silent-failure-reviewer` - このスキルの主な利用者
