---
name: reviewing-type-safety
description: 最大の型カバレッジのためのTypeScript型安全パターンとベストプラクティス。
allowed-tools: [Read, Grep, Glob, Task]
agent: type-safety-reviewer
user-invocable: false
---

# 型安全レビュー

目標: 最小限の型の体操で最大の型安全性。

## メトリクス

| コンテキスト   | ターゲット | 警告             |
| -------------- | ---------- | ---------------- |
| 型カバレッジ   | 95%+       | < 90%            |
| Any使用        | 0          | > 5インスタンス  |
| 型アサーション | 最小限     | > 10インスタンス |
| 暗黙のany      | 0          | Any > 0          |
| Strictモード   | すべて有効 | いずれか無効     |

## セクションベースのロード

| セクション | ファイル                      | フォーカス         |
| ---------- | ----------------------------- | ------------------ |
| カバレッジ | `references/type-coverage.md` | anyを避ける        |
| ガード     | `references/type-guards.md`   | ナローイング、判別 |
| Strict     | `references/strict-mode.md`   | tsconfig、React型  |

## クイックチェックリスト

- [ ] すべての関数に明示的な戻り値型
- [ ] すべてのパラメータが型付き（暗黙のanyなし）
- [ ] すべてのデータ構造にInterface/type
- [ ] 正当化なしの`any`なし
- [ ] Union型に型述語
- [ ] `never`による網羅的チェック
- [ ] 安全でない`as`アサーションを避ける

## 主要原則

| 原則             | 適用                           |
| ---------------- | ------------------------------ |
| Fail Fast        | コンパイル時にキャッチ         |
| TSに推論させる   | 明確なものを過度に型付けしない |
| 型はドキュメント | 良い型 = ドキュメント          |
| unknownを優先    | `any`より`unknown`を使用       |

## 参照

- [@./references/result-type.md] - Result型エラーハンドリング
