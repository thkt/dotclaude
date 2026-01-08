# TDDテスト生成スキル

TDD/RGRCサイクルとBaby Steps方法論に基づくテスト生成スキル。

## 概要

Red-Green-Refactor-Commitサイクルに従い、テストとコードを段階的に構築。

これは**ナレッジベーススキル** - Claudeが直接テストを書き、Bashツール経由でテストコマンドを実行し、スタンドアロンスクリプトよりもコンテキストを意識したテスト生成を提供。

## 使い方

`/code` コマンドでテストを書く際に自動的に使用。

```bash
/code "ユーザーバリデーションを実装"
```

ClaudeはRGRCサイクルに従う:

1. **Red** - 失敗するテストを書く
2. **Green** - テストを通す最小限のコードを書く
3. **Refactor** - コード品質を改善
4. **Commit** - 変更をコミット

## 構造

```text
tdd-test-generation/
├── SKILL.md           # メインスキル定義（RGRCワークフロー）
├── README.md          # このファイル
├── assets/            # 設定テンプレート（参照用）
│   ├── vitest.config.ts   # Vitest設定テンプレート
│   └── jest.config.js     # Jest設定テンプレート
└── references/        # ガイド
    ├── feature-driven.md  # 機能駆動TDDワークフロー
    └── bug-driven.md      # バグ駆動TDDワークフロー
```

## テストフレームワーク検出

Claudeはpackage.jsonからテストフレームワークを自動検出:

- **Vitest**: `vitest` が依存関係にある場合
- **Jest**: `jest` が依存関係にある場合
- **デフォルト**: Vitest（フレームワークが見つからない場合）

## AAAパターン

テストはAAA（Arrange-Act-Assert）パターンに従う:

```typescript
it("should calculate total correctly", () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }];

  // Act
  const result = calculateTotal(items);

  // Assert
  expect(result).toBe(300);
});
```

## 関連コマンド

- `/code` - TDD実装（このスキルを参照）
- `/test` - テスト実行と検証

## 詳細

完全なドキュメントは `SKILL.md` を参照。
