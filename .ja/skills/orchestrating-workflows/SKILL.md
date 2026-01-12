---
name: orchestrating-workflows
description: >
  /code, /fix, /audit などの実装コマンド用のワークフローオーケストレーションパターン。
  ステップバイステップの実行フロー、品質ゲート、完了基準を提供。
  Triggers: workflow, orchestration, command flow, IDR, test generation, RGRC, quality gates, completion criteria.
allowed-tools: Read, Write, Grep, Glob, Task, Bash
user-invocable: false
---

# ワークフローオーケストレーション

実装コマンド用のワークフローパターンとオーケストレーションロジック。

## 目的

以前 `references/commands/` に散在していたワークフロー知識を一元化。
コマンドは薄いオーケストレーターとなり、実行ロジックはこのスキルを参照。

## ワークフロータイプ

### 実装ワークフロー

| コマンド | ワークフロー参照                                                | 目的                   |
| -------- | --------------------------------------------------------------- | ---------------------- |
| `/code`  | [@./references/code-workflow.md](./references/code-workflow.md) | RGRCサイクルでTDD実装  |
| `/fix`   | [@./references/fix-workflow.md](./references/fix-workflow.md)   | 根本原因分析でバグ修正 |

### 共有パターン

| パターン    | 参照                                                                              | 使用先                            |
| ----------- | --------------------------------------------------------------------------------- | --------------------------------- |
| IDR生成     | [@./references/shared/idr-generation.md](./references/shared/idr-generation.md)   | /code, /audit, /polish, /validate |
| TDDサイクル | [@./references/shared/tdd-cycle.md](./references/shared/tdd-cycle.md)             | /code, /fix                       |
| テスト生成  | [@./references/shared/test-generation.md](./references/shared/test-generation.md) | /code, /fix                       |

## クイックリファレンス

### RGRCサイクル (Red-Green-Refactor-Commit)

```text
1. Red    - 失敗するテストを作成（失敗理由を確認）
2. Green  - 最小限のコードで通過（"罪を犯してよい" - quick/dirty OK）
3. Refactor - 原則を適用（テストをグリーンに保つ）
4. Commit - 安定状態を保存
```

### 品質ゲート

| ゲート     | 目標             | 検証方法                    |
| ---------- | ---------------- | --------------------------- |
| テスト     | 全て通過         | `npm test` 終了コード 0     |
| リント     | エラー 0         | `npm run lint` 終了コード 0 |
| 型         | エラーなし       | `tsc --noEmit` 終了コード 0 |
| カバレッジ | C0 ≥90%, C1 ≥80% | カバレッジレポート          |

### 完了基準

| チェック         | ステータス |
| ---------------- | ---------- |
| 全テスト通過     | 必須       |
| リントエラーなし | 必須       |
| 型エラーなし     | 必須       |
| ドキュメント更新 | 動作変更時 |
| IDR生成          | SOW存在時  |

## 参照

### 原則 (rules/)

- [@../../rules/development/COMPLETION_CRITERIA.md](../../rules/development/COMPLETION_CRITERIA.md) - 信頼度メトリクス
- [@../../rules/development/PROGRESSIVE_ENHANCEMENT.md](../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - アウトカムファースト開発

### 関連スキル

- `generating-tdd-tests` - TDDの基礎
- `applying-code-principles` - 設計原則

### 使用コマンド

- `/code` - TDD実装
- `/fix` - バグ修正
- `/audit` - コードレビュー
- `/polish` - コード簡素化
- `/validate` - SOW検証
