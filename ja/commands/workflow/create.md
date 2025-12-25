---
description: 対話形式の記録で再利用可能なブラウザ自動化ワークフローを作成
aliases: [create-workflow, workflow-create]
allowed-tools: Read, Write, Task, mcp__claude-in-chrome__*
model: inherit
argument-hint: "[ワークフロー名]"
---

# /workflow:create - ブラウザワークフロー生成

Chrome DevTools MCPを使用して、対話形式のステップ記録により再利用可能なブラウザ自動化ワークフローを作成します。

## 目的

カスタムブラウザ自動化ワークフローを生成し、以下を実現：

- 会話形式での対話的な記録
- 再利用可能なスラッシュコマンドとして保存
- `/ワークフロー名`で繰り返し実行
- E2Eテスト、監視、または自動化に利用

## 使用方法

```bash
/workflow:create "ワークフロー名"
```

例：

```bash
/workflow:create "login-test"
```

## 仕組み

1. **対話的な記録**: AIが各ステップの定義をガイド
2. **ライブ実行**: 定義したステップを実際のブラウザで実行
3. **Markdown生成**: ワークフローをコマンドファイルとして保存
4. **自動検出**: 生成されたコマンドが即座に利用可能に

## ワークフロー記録プロセス

### ステップ1: 初期化

```txt
ユーザー: /workflow:create "my-workflow"
AI: ワークフロー'my-workflow'を作成します。ステップを定義しましょう。
    最初に何をしますか？
```

### ステップ2: 対話形式でステップを定義

```txt
ユーザー: https://example.com に遷移
AI: ✓ https://example.com に遷移しました
    [ページスナップショットを表示]
    次は何をしますか？

ユーザー: ログインボタンをクリック
AI: [UID付きの要素を表示]
    どの要素ですか？（UIDまたは説明を提供）

ユーザー: uid:abc123
AI: ✓ ログインボタンをクリックしました
    次は何をしますか？

ユーザー: メールアドレス入力欄に "user@example.com" を入力
AI: [入力フィールドを表示]
    どのフィールドですか？（UIDを提供）

ユーザー: uid:def456
AI: ✓ メールアドレス欄に入力しました
    次は何をしますか？

ユーザー: 完了
AI: ✓ ワークフローを記録しました！
    保存先: .claude/commands/workflows/my-workflow.md
    実行: /my-workflow
```

## 生成されるワークフローファイルの構造

```markdown
# /my-workflow

このワークフローが何をするかの簡単な説明

## Steps

1. Navigate to https://example.com
2. Click element (uid: abc123) - login button
3. Fill element (uid: def456) with "user@example.com"
4. Click element (uid: ghi789) - submit button
5. Wait for text "Welcome" to appear

## 使用方法

\```bash
/my-workflow
\```

## 注意事項

- 作成日: 2025-10-02
- Chrome DevTools MCP が必要
```

## 利用可能なアクション

記録中に使用できるアクション：

- **遷移**: `<URL> に遷移`
- **クリック**: `<要素の説明> をクリック` (AIが利用可能な要素を表示)
- **入力**: `<フィールド> に "<テキスト>" を入力` (AIが入力フィールドを表示)
- **待機**: `"<テキスト>" が表示されるまで待機`
- **スクリーンショット**: `スクリーンショットを撮る`
- **スクロール**: `<要素> までスクロール`
- **完了**: `完了` (記録を終了)

## Chrome DevTools MCP統合

このコマンドは以下の`mcp__claude-in-chrome__*`ツールを使用：

- `navigate_page` - URLへの遷移
- `take_snapshot` - ページ要素の識別
- `click` - UIDによる要素のクリック
- `fill` - フォームフィールドの入力
- `wait_for` - 条件の待機
- `take_screenshot` - スクリーンショットの撮影

## ファイルの保存場所

生成されたワークフローは以下に保存：

```txt
.claude/commands/workflows/<ワークフロー名>.md
```

保存後、ワークフローは検出可能なスラッシュコマンドになります：

```bash
/ワークフロー名
```

## 使用例

- **E2Eテスト**: UIテストワークフローの自動化
- **監視**: 重要なユーザーフローの定期チェック
- **データ収集**: スクレイピングやフォーム自動化
- **リグレッションテスト**: 変更後の機能検証
- **オンボーディング**: セットアッププロセスの文書化と自動化

## ワークフロー例

### ログインテスト

```bash
/workflow:create "login-test"
→ ログインフローをテストする対話的なステップ
→ /login-test として保存
```

### 価格監視

```bash
/workflow:create "check-price"
→ 商品ページへ遷移
→ 価格要素を抽出
→ スクリーンショットを撮影
→ /check-price として保存
```

## ヒント

1. **具体的に**: 要素を明確に説明して正確な選択を
2. **スナップショットを活用**: 要素選択前にページスナップショットを確認
3. **待機を追加**: 動的コンテンツには待機ステップを含める
4. **進めながらテスト**: 各ステップが即座に実行されて検証可能
5. **後で編集**: 生成されたMarkdownファイルは手動編集可能

## 制限事項

- Chrome DevTools MCPの設定が必要
- 複雑な条件分岐は手動編集が必要
- JavaScript実行はサポートされるが手動追加が必要
- 各ワークフローは新しいブラウザセッションで実行

## 関連コマンド

- `/test` - ブラウザテストを含む包括的なテスト
- `/auto-test` - 修正機能付き自動テストランナー
- `/fix` - 素早いバグ修正

## 技術詳細

**保存形式**: Markdown（人間が編集可能）
**実行方法**: スラッシュコマンドシステム
**MCPツール**: Chrome DevTools MCP
**自動検出**: `.claude/commands/workflows/` ディレクトリ経由

---

*生成されたワークフローは再起動なしで即座にスラッシュコマンドとして利用可能になります。*
