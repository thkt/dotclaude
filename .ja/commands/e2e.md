---
description: 対話的なブラウザ操作ガイドを通じてドキュメントとPlaywrightテストを生成
allowed-tools: Read, Write, Glob, Task, mcp__claude-in-chrome__*, mcp__playwright__*
model: opus
argument-hint: "[テスト名]"
dependencies: [automating-browser]
---

# /e2e - E2Eテスト生成コマンド

対話的なブラウザ操作ガイドを通じてドキュメントとPlaywrightテストを生成する。

## 使い方

```text
/e2e [テスト名]
```

## 概要

1. **開始**: テスト名を指定してコマンド実行
2. **確認**: 対話ダイアログで操作内容を説明・確認
3. **実行**: claude-in-chromeでブラウザ操作を実行
4. **生成**: ドキュメントとPlaywrightテストを作成

## 出力先

```text
tests/e2e/
└── [テスト名]/
    ├── README.md           # ドキュメント（スクショ付き）
    ├── screenshots/        # 各ステップの画像
    └── [テスト名].spec.ts  # Playwrightテスト
```

## ワークフロー

### Step 1: コマンド開始

```text
/e2e login
```

### Step 2: 操作チェック（対話ダイアログ）

PRE_TASK_CHECKと同様の構造化されたチェックを表示：

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 E2Eテスト: login

📋 テストする操作を説明してください:
   例: 「ログインページに移動、認証情報を入力、送信ボタンをクリック」

❓ 必要な情報:
   - 対象URL（わかれば）
   - 実行するユーザー操作
   - 期待する結果

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

ユーザーが操作を説明した後、Claudeが確認：

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 理解度: ██████████ 95%

✅ 実行する操作:
   1. https://example.com/login に移動
   2. メールフィールドにテスト値を入力
   3. パスワードフィールドにテスト値を入力
   4. ログインボタンをクリック

🎯 期待する結果:
   - ダッシュボードにリダイレクト
   - ログイン成功

⚡ 実行してよろしいですか？ (y/n)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**注記**: 確認ダイアログには `AskUserQuestion` ツールを使用。

### Step 3: ブラウザ操作を実行

ユーザーが確認後（y）、Claudeがclaude-in-chromeを使って：

- 対象URLに移動
- フォームフィールドを入力
- ボタンをクリック
- 各ステップでスクリーンショットを取得

### Step 4: 自動生成

以下が自動生成される（生成ファイルは英語で出力 - 国際標準のため）：

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

## エラーハンドリング

| シナリオ | 動作 |
| --- | --- |
| テスト名が未指定 | プロンプト: 「テスト名を指定してください（例: /e2e login）」 |
| claude-in-chromeが利用不可 | エラー: 「ブラウザ自動化が利用できません。Chromeと拡張機能を確認してください。」 |
| ユーザーが操作ダイアログをキャンセル | ファイル生成せずに正常終了 |
| ナビゲーション失敗 | エラーを報告、続行または中止をユーザーに確認 |
| セレクタ推測に失敗 | 汎用セレクタ（`text=`、`role=`等）にフォールバック、警告を表示 |
| スクリーンショットが取得できない | 画像なしでステップを記録、「[スクリーンショット未取得]」と注記 |
| tests/ディレクトリが存在しない | `tests/e2e/[name]/`構造を自動作成 |

### Step 5: 生成テストの検証 (verify-app)

テストファイル生成後、自動で検証を実行:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 検証ステップ

生成されたPlaywrightテストを実行中...

⏳ 実行: npx playwright test [test-name].spec.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**検証プロセス**:

1. Playwright MCPで生成テストを実行
2. 期待結果と実際の結果を比較
3. 差分があれば提案付きでレポート

**検証結果**:

| 結果 | アクション |
| --- | --- |
| ✅ 全アサーション合格 | 成功を報告、テスト準備完了 |
| ⚠️ 一部アサーション失敗 | 差分を表示、セレクタ修正を提案 |
| ❌ テスト実行失敗 | エラーを報告、再生成を提案 |

**自動修正提案**:

検証失敗時、Claudeが以下を提案:

- 代替セレクタ（id → role → text）
- タイミング調整（waitForSelector、timeout）
- 実際のDOMに基づくアサーション修正

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 検証結果

テスト: login.spec.ts
ステータス: ⚠️ 1/3 アサーション失敗

失敗したアサーション:
  期待: await expect(page).toHaveURL('/dashboard')
  実際: URLは '/dashboard?welcome=true'

修正提案:
  await expect(page).toHaveURL(/\/dashboard/)

修正を適用しますか？ (y/n)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 関連ツール

- `claude-in-chrome` - 対話的ブラウザ操作
- `Playwright MCP` - ヘッドレス実行・CI連携・検証
- [@../../skills/automating-browser/SKILL.md](~/.claude/skills/automating-browser/SKILL.md) - ブラウザ自動化ガイド

## 注意事項

- 操作中にスクリーンショットを撮っておくとドキュメントが充実する
- 機密情報（パスワード等）はプレースホルダーに置換される
- testsディレクトリがない場合は自動作成
- **検証ループ**によりテスト信頼性が2-3倍向上（Borisワークフロー）
