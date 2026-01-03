# /e2e - E2Eテスト生成コマンド

claude-in-chromeでの操作からドキュメントとPlaywrightテストを同時生成する。

## 使い方

```text
/e2e [テスト名]
```

## 概要

1. 直前のclaude-in-chrome操作を解析
2. スクリーンショット付きドキュメント（README.md）を生成
3. Playwrightテストコード（[name].spec.ts）を生成

## 出力先

```text
tests/e2e/
└── [テスト名]/
    ├── README.md           # ドキュメント（スクショ付き）
    ├── screenshots/        # 各ステップの画像
    └── [テスト名].spec.ts  # Playwrightテスト
```

## ワークフロー

### Step 1: ブラウザ操作を実行

claude-in-chromeを使って対話的にブラウザを操作する。

```text
ユーザー: ログインページをテストして
Claude: [navigate, form_input, click等を実行]
```

### Step 2: /e2e コマンドを実行

```text
/e2e login
```

### Step 3: 自動生成

以下が自動生成される：

**README.md（ドキュメント）**:

```markdown
# Login Test

## Steps

### 1. Navigate to login page
![Step 1](./screenshots/01-navigate.png)
- URL: https://example.com/login

### 2. Fill email field
![Step 2](./screenshots/02-fill-email.png)
- Selector: #email
- Value: test@example.com
...
```

**[name].spec.ts（Playwrightテスト）**:

```typescript
import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', '********');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## 生成ロジック

### 会話履歴からの操作抽出

直前の会話から以下のMCPツール呼び出しを抽出：

| ツール | Playwright変換 |
| --- | --- |
| `navigate` | `page.goto(url)` |
| `form_input` | `page.fill(selector, value)` |
| `computer` (click) | `page.click(selector)` |
| `computer` (type) | `page.type(selector, text)` |
| `computer` (screenshot) | スクリーンショット保存 |

### セレクタ変換

claude-in-chromeの`ref`（例: `ref_5`）から実際のセレクタを推測：

- アクセシビリティツリーから要素を特定
- id, name, role, text等から最適なセレクタを選択

## 関連ツール

- `claude-in-chrome` - 対話的ブラウザ操作
- `Playwright MCP` - ヘッドレス実行・CI連携
- `automating-browser` スキル - ブラウザ自動化ガイド

## 注意事項

- 操作中にスクリーンショットを撮っておくとドキュメントが充実する
- 機密情報（パスワード等）はプレースホルダーに置換される
- testsディレクトリがない場合は自動作成
