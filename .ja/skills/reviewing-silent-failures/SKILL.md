---
name: reviewing-silent-failures
description: >
  フロントエンドコードのサイレント障害検出パターン。
  トリガー: サイレント障害, silent failure, 空のcatch, empty catch,
  未処理Promise, unhandled rejection, unhandled promise, Error Boundary,
  fire and forget, エラーハンドリング, error handling, try-catch.
allowed-tools: Read, Grep, Glob, Task
---

# サイレント障害レビュー - エラーの可視性とハンドリング

目標: すべての障害が可視で、デバッグ可能で、ユーザーに通知される。

## サイレント障害リスクレベル

| パターン                   | リスク         | 影響                                     |
| -------------------------- | -------------- | ---------------------------------------- |
| 空のcatchブロック          | [クリティカル] | エラーが完全に隠される                   |
| catchなしのPromise         | [クリティカル] | 未処理のrejection                        |
| Fire and forget async      | [高]           | エラーコンテキストが失われる             |
| Console.logのみ            | [高]           | ユーザーフィードバックなし               |
| Error Boundaryなし         | [高]           | コンポーネントエラーでアプリがクラッシュ |
| 過度なオプショナルチェーン | [中]           | バグを隠す可能性                         |

## セクションベースのロード

| セクション | ファイル                           | フォーカス                  | トリガー               |
| ---------- | ---------------------------------- | --------------------------- | ---------------------- |
| 検出       | `references/detection-patterns.md` | Regexパターン、検索コマンド | 空のcatch, empty catch |

## クイックチェックリスト

### クリティカル（修正必須）

- [ ] 空のcatchブロックなし
- [ ] すべてのPromiseにエラーハンドリング（`.catch`または`try-catch`）
- [ ] エラーハンドリングで`console.log`のみを使用しない
- [ ] イベントハンドラーでエラーを飲み込まない

### 高優先度

- [ ] 主要セクションにError Boundaryを配置
- [ ] useEffect内の非同期操作にエラーハンドリング
- [ ] API呼び出しに適切なエラー状態
- [ ] フォーム送信が失敗を処理

### ベストプラクティス

- [ ] エラーをコンテキスト付きでログ（ユーザーID、アクション等）
- [ ] 障害に対するユーザー向けエラーメッセージ
- [ ] オプショナルチェーンは防御的ではなく意図的に使用
- [ ] 一時的な障害のリトライロジック

## 主要原則

| 原則                         | 適用                         |
| ---------------------------- | ---------------------------- |
| Fail Fast                    | 障害を可視化し即座に検出     |
| ユーザーフィードバック       | 障害を常にユーザーに通知     |
| コンテキストロギング         | デバッグに十分な情報をログ   |
| グレースフルデグラデーション | サイレントではなく優雅に失敗 |

## 検出コマンド

```bash
# 空のcatchブロック
rg "catch\s*\([^)]*\)\s*\{\s*\}" --glob "*.{ts,tsx}"

# catchなしのthen
rg "\.then\([^)]+\)$" --glob "*.{ts,tsx}"

# Console.logのみのエラーハンドリング
rg "catch.*console\.log" --glob "*.{ts,tsx}"
```

## 一般的なパターン

### 空のCatch → 適切なハンドリング

```typescript
// Bad: サイレント障害
try {
  await fetchUserData();
} catch (e) {
  // ここに何もない - エラーが消える
}

// Good: 適切なハンドリング
try {
  await fetchUserData();
} catch (error) {
  logger.error("Failed to fetch user data", { error });
  setError("ユーザーデータを読み込めませんでした。再試行してください。");
}
```

### Promiseチェーン → エラーハンドリング

```typescript
// Bad: 未処理のrejection
fetchData().then((data) => setData(data));

// Good: エラーハンドリング付き
fetchData()
  .then((data) => setData(data))
  .catch((error) => {
    logger.error("Failed to fetch data", error);
    setError("読み込みに失敗しました");
  });
```

## 参照

### コア原則

- [@../../../rules/development/PROGRESSIVE_ENHANCEMENT.md](../../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - グレースフルデグラデーション

### 関連スキル

- `reviewing-type-safety` - 型安全性がコンパイル時にエラーをキャッチ
- `generating-tdd-tests` - エラーパスをテスト

### 使用エージェント

- `silent-failure-reviewer` - このスキルの主要な使用者
