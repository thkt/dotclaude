---
description: MarkdownワークフローをPlaywrightテストコードにエクスポート
aliases: [export-workflow, workflow-to-playwright]
allowed-tools: Read, Write, Glob, Grep
model: inherit
argument-hint: "<workflow-name>"
dependencies: [automating-browser]
---

# /workflow:export - Playwrightテストジェネレーター

`/workflow:create` で作成したMarkdownワークフローファイルをPlaywrightテストコードに変換します。

## 目的

探索的なブラウザワークフローを実行可能なPlaywrightテストに変換：

- CI/CD統合
- リグレッションテスト
- 安定したフローの自動検証

## 使用方法

```bash
/workflow:export <workflow-name>
```

例：

```bash
/workflow:export login-test
```

## ワークフロー

```mermaid
flowchart LR
    A[Markdownワークフロー] --> B[ステップ解析]
    B --> C[Playwrightコード生成]
    C --> D[./tests/e2e/に出力]
```

## 入力形式

`/workflow:create` からのMarkdownワークフローを想定：

```markdown
# /workflow-name

ワークフローの説明

## Steps

1. Navigate to https://example.com
2. Click element (uid: abc123) - ボタンの説明
3. Fill element (uid: def456) with "値"
4. Wait for text "期待されるテキスト" to appear
```

## 出力形式

Playwright TypeScriptテストを生成：

```typescript
import { test, expect } from '@playwright/test';

test('workflow-name: 説明', async ({ page }) => {
  // Step 1: ナビゲート
  await page.goto('https://example.com');
  await page.waitForLoadState('networkidle');

  // Step 2: クリック
  await page.getByRole('button', { name: /ボタンの説明/i }).click();

  // Step 3: 入力
  await page.getByRole('textbox').fill('値');

  // Step 4: 検証
  await expect(page.getByText('期待されるテキスト')).toBeVisible();
});
```

## 出力先

テストは以下に書き込まれます：

```txt
./tests/e2e/<workflow-name>.spec.ts
```

## ステップマッピング

| Markdownステップ | Playwrightコード |
| --- | --- |
| `Navigate to <URL>` | `page.goto('<URL>')` |
| `Click element ... - <desc>` | `page.getByRole('button', { name: /<desc>/i }).click()` |
| `Fill element ... with "<value>"` | `page.getByRole('textbox').fill('<value>')` |
| `Wait for text "<text>"` | `expect(page.getByText('<text>')).toBeVisible()` |
| `Take screenshot` | `page.screenshot({ path: ... })` |
| `Scroll to <element>` | `page.locator('<element>').scrollIntoViewIfNeeded()` |

## セレクタ戦略

Playwrightのベストプラクティスに従う：

1. **ロールセレクタ**（推奨）: `getByRole('button', { name: /text/i })`
2. **テキストセレクタ**: `getByText('表示テキスト')`
3. **テストID**: `getByTestId('element-id')`
4. **CSSセレクタ**（フォールバック）: `locator('css-selector')`

## 生成コードパターン

### Network Idle待機

すべてのナビゲーションに含まれます：

```typescript
await page.waitForLoadState('networkidle');
```

### アサーションスタイル

Playwright組み込みのexpectを使用：

```typescript
await expect(page.getByText('Success')).toBeVisible();
await expect(page).toHaveURL(/dashboard/);
```

### エラーハンドリング

生成されたテストには暗黙的な待機と自動リトライ（Playwrightデフォルト）が含まれます。

## 変換例

### 入力: `.claude/commands/workflows/checkout-flow.md`

```markdown
# /checkout-flow

ECサイトのチェックアウト検証

## Steps

1. Navigate to https://shop.example.com/cart
2. Click element (uid: xyz) - 購入手続きへ
3. Fill element (uid: email) with "test@example.com"
4. Fill element (uid: card) with "4111111111111111"
5. Click element (uid: submit) - 注文を確定
6. Wait for text "注文完了" to appear
```

### 出力: `./tests/e2e/checkout-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('checkout-flow: ECサイトのチェックアウト検証', async ({ page }) => {
  // Step 1: カートへ移動
  await page.goto('https://shop.example.com/cart');
  await page.waitForLoadState('networkidle');

  // Step 2: 購入手続きへ
  await page.getByRole('button', { name: /購入手続きへ/i }).click();

  // Step 3: メール入力
  await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');

  // Step 4: カード番号入力
  await page.getByRole('textbox', { name: /card/i }).fill('4111111111111111');

  // Step 5: 注文確定
  await page.getByRole('button', { name: /注文を確定/i }).click();

  // Step 6: 確認
  await expect(page.getByText('注文完了')).toBeVisible();
});
```

## 制限事項

- UIDベースのセレクタはロール/テキストセレクタに変換（ベストエフォート）
- 複雑な条件ロジックは手動編集が必要
- 動的な待機は調整が必要な場合あり
- 認証フローはテストフィクスチャが必要な場合あり

## エラーハンドリング

- **ワークフロー未検出**: 利用可能なワークフロー一覧付きエラーメッセージ
- **無効な形式**: 具体的なパースエラー箇所を警告表示
- **出力ディレクトリ未存在**: `./tests/e2e/` を自動作成

## 生成後の作業

生成後、以下が必要な場合があります：

1. **セレクタ調整**: 特定のDOMに合わせてレビュー・調整
2. **フィクスチャ追加**: 認証やテストデータ用
3. **Playwright設定**: `playwright.config.ts` の存在確認
4. **テスト実行**: `npx playwright test tests/e2e/<workflow>.spec.ts`

## CI/CDとの統合

生成されたテストは標準的なPlaywright CI設定と互換性があります：

```yaml
# GitHub Actions例
- name: Playwrightテスト実行
  run: npx playwright test tests/e2e/
```

## 関連コマンド

- `/workflow:create` - Markdownワークフローを対話的に作成
- `/test` - Playwrightを含む総合テスト実行
- `/auto-test` - 自動テストランナー（修正付き）

**典型的なワークフロー**: `/workflow:create` → ワークフロー検証 → `/workflow:export` → CI/CD

## 参照

- [Playwrightドキュメント](https://playwright.dev/)
- `webapp-testing` スキル（公式） - 高度なPlaywrightパターン
- `automating-browser` スキル - 対話的ブラウザ自動化
