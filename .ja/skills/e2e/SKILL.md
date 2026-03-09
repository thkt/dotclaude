---
name: e2e
description: ガイド付きブラウザ操作を通じてドキュメントとPlaywrightテストを生成。ユーザーがE2Eテスト, ブラウザテスト, Playwrightテスト, e2e test等に言及した場合に使用。
allowed-tools: Read, Write, Glob, Task, Bash(agent-browser:*), AskUserQuestion
model: opus
argument-hint: "[テスト名]"
user-invocable: true
---

# /e2e - E2Eテスト生成

ブラウザ操作を通じてドキュメントとPlaywrightテストを生成。

## 入力

- テスト名: `$1`（必須）
- `$1`が空の場合 → AskUserQuestionで選択

### テスト設定

| 質問     | 選択肢            |
| -------- | ----------------- |
| テスト名 | [Otherで自由入力] |
| 開始URL  | [Otherで自由入力] |

## 実行

`agent-browser` 経由のブラウザ操作、その後Playwrightテストを生成。

## ツール (agent-browser コマンド)

| コマンド                            | 目的                           |
| ----------------------------------- | ------------------------------ |
| `agent-browser --headed open <url>` | URLに移動                      |
| `agent-browser snapshot -i`         | インタラクティブ要素を取得     |
| `agent-browser click @ref`          | 要素をクリック                 |
| `agent-browser fill @ref "text"`    | フォーム入力（クリアして入力） |
| `agent-browser type @ref "text"`    | 要素に入力                     |
| `agent-browser press <key>`         | キー押下（Enter, Tab等）       |
| `agent-browser get text @ref`       | 要素テキストを読取             |
| `agent-browser wait <sel\|ms>`      | 要素または時間を待機           |
| `agent-browser screenshot [path]`   | スクリーンショット             |
| `agent-browser record start <path>` | WebM録画開始 (v0.6+)           |
| `agent-browser record stop`         | 録画停止・保存 (v0.6+)         |
| `agent-browser close`               | ブラウザセッションを閉じる     |

## ワークフロー

1. `agent-browser --headed open <url>` - ページを開く
2. `agent-browser snapshot -i` - インタラクティブ要素を取得
3. `@ref` を使って操作（click, fill, type）
4. DOM 変更後は再度 `snapshot` を取得

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

```gherkin
Given ユーザーがログインページにいる
When ユーザーが認証情報を入力して送信
Then ユーザーがダッシュボードにリダイレクト
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

## 検証

| チェック項目                           | 必須 |
| -------------------------------------- | ---- |
| Playwright spec.ts を生成したか？      | Yes  |
| スクリーンショットをキャプチャしたか？ | Yes  |
