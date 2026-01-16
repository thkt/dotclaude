# E2Eテストワークフロー

## フロー

```text
/e2e → Browser automation → Generate test → Document
```

## ツール

| ツール        | 目的               |
| ------------- | ------------------ |
| `navigate`    | URLに移動          |
| `click`       | 要素をクリック     |
| `form_input`  | フォーム入力       |
| `read_page`   | ページ内容を読む   |
| `screenshot`  | スクリーンショット |
| `gif_creator` | 操作を記録         |

## 出力

| ファイル | 場所                           |
| -------- | ------------------------------ |
| テスト   | `tests/e2e/[scenario].spec.ts` |
| 記録     | `docs/e2e/[scenario].gif`      |

## Playwrightフォーマット

```typescript
test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "user@example.com");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## シナリオフォーマット

```markdown
**Given**: ユーザーがログインページにいる
**When**: ユーザーが認証情報を入力して送信する
**Then**: ユーザーがダッシュボードにリダイレクトされる
```

## ベストプラクティス

| プラクティス           | 理由                 |
| ---------------------- | -------------------- |
| ハッピーパスを最初に   | ベースライン動作     |
| アサーションを追加     | 期待状態を検証       |
| 安定したセレクタを使用 | 不安定なテストを回避 |
| 1テスト1シナリオ       | 焦点を維持           |
