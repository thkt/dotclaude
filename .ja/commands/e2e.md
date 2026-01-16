---
description: ガイド付きブラウザ操作を通じてドキュメントとPlaywrightテストを生成
allowed-tools: Read, Write, Glob, Task, mcp__claude-in-chrome__*, mcp__playwright__*
model: opus
argument-hint: "[テスト名]"
---

# /e2e - E2Eテスト生成

ブラウザ操作を通じてドキュメントとPlaywrightテストを生成。

## 入力

- 引数: テスト名（必須）
- 未指定時: AskUserQuestionで確認

## 実行

`claude-in-chrome`経由のブラウザ操作、その後Playwrightテストを生成。

## ツール

| ツール        | 用途               |
| ------------- | ------------------ |
| `navigate`    | URLに移動          |
| `click`       | 要素をクリック     |
| `form_input`  | フォーム入力       |
| `read_page`   | ページ内容を読取   |
| `screenshot`  | スクリーンショット |
| `gif_creator` | 操作を録画         |

## Playwright形式

```typescript
test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "user@example.com");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## シナリオ形式

```markdown
**Given**: ユーザーがログインページにいる
**When**: ユーザーが認証情報を入力して送信
**Then**: ユーザーがダッシュボードにリダイレクト
```

## ベストプラクティス

| プラクティス           | 理由                 |
| ---------------------- | -------------------- |
| ハッピーパスを先に録画 | ベースライン動作     |
| アサーション追加       | 期待状態を検証       |
| 安定したセレクタ使用   | フレイキーテスト回避 |
| 1シナリオ1テスト       | フォーカスを維持     |

## 出力

```text
tests/e2e/[テスト名]/
├── README.md          # ドキュメント
├── screenshots/       # ステップ画像
└── [name].spec.ts     # Playwrightテスト
```
