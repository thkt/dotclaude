---
description: インタラクティブ記録で再利用可能なブラウザ自動化ワークフローを作成
aliases: [create-workflow, workflow-create]
allowed-tools: Read, Write, Task, mcp__claude-in-chrome__*
model: inherit
argument-hint: "[workflow-name]"
dependencies: [automating-browser]
---

# /workflow:create - ブラウザワークフロージェネレーター

Chrome DevTools MCPを使用して、インタラクティブなステップ記録により再利用可能なブラウザ自動化ワークフローを作成。

## 目的

以下が可能なカスタムブラウザ自動化ワークフローを生成:

- 会話を通じてインタラクティブに記録
- 再利用可能なスラッシュコマンドとして保存
- `/workflow-name`で繰り返し実行
- E2Eテスト、モニタリング、または自動化に使用

## 使用方法

```bash
/workflow:create "workflow-name"
```

例:

```bash
/workflow:create "login-test"
```

## 動作の仕組み

1. **インタラクティブ記録**: AIが各ステップの定義をガイド
2. **ライブ実行**: 定義時にステップが実際のブラウザで実行される
3. **Markdown生成**: ワークフローがコマンドファイルとして保存
4. **自動検出**: 生成されたコマンドは即座に利用可能

## ワークフロー記録プロセス

### ステップ1: 初期化

```txt
あなた: /workflow:create "my-workflow"
AI: ワークフロー 'my-workflow' を作成します。ステップを定義しましょう。
    最初に何をしますか？
```

### ステップ2: ステップをインタラクティブに定義

```txt
あなた: https://example.com に移動
AI: ✓ https://example.com に移動しました
    [ページスナップショットを表示]
    次は？

あなた: ログインボタンをクリック
AI: [UIDを含む要素を表示]
    どの要素ですか？（UIDまたは説明を入力）

あなた: uid:abc123
AI: ✓ ログインボタンをクリックしました
    次は？

あなた: メールフィールドに "user@example.com" を入力
AI: [入力フィールドを表示]
    どのフィールドですか？（UIDを入力）

あなた: uid:def456
AI: ✓ メールフィールドに入力しました
    次は？

あなた: done
AI: ✓ ワークフローを記録しました！
    保存先: .claude/commands/workflows/my-workflow.md
    実行: /my-workflow
```

## 生成されるワークフローファイル構造

```markdown
# /my-workflow

このワークフローが行う内容の簡単な説明

## ステップ

1. https://example.com に移動
2. 要素をクリック（uid: abc123） - ログインボタン
3. 要素（uid: def456）に "user@example.com" を入力
4. 要素をクリック（uid: ghi789） - 送信ボタン
5. "Welcome" テキストが表示されるまで待機

## 使用方法

\```bash
/my-workflow
\```

## 備考

- 作成日: 2025-10-02
- Chrome DevTools MCP必須
```

## 利用可能なアクション

記録中に使用できるアクション:

- **Navigate**: `<URL>に移動`
- **Click**: `<要素の説明>をクリック`（AIが利用可能な要素を表示）
- **Fill**: `<フィールド>に"<テキスト>"を入力`（AIが入力フィールドを表示）
- **Wait**: `"<テキスト>"が表示されるまで待機`
- **Screenshot**: `スクリーンショットを撮影`
- **Scroll**: `<要素>までスクロール`
- **Done**: `done`（記録を終了）

## Claude in Chrome MCP統合

このコマンドは`mcp__claude-in-chrome__*`ツールを使用:

- `navigate_page` - URLに移動
- `take_snapshot` - ページ要素を識別
- `click` - UIDで要素をクリック
- `fill` - フォームフィールドを入力
- `wait_for` - 条件を待機
- `take_screenshot` - スクリーンショットをキャプチャ

## ファイル保存場所

生成されたワークフローの保存先:

```txt
.claude/commands/workflows/<workflow-name>.md
```

保存後、ワークフローは検出可能なスラッシュコマンドになる:

```bash
/workflow-name
```

## ユースケース

- **E2Eテスト**: UIテストワークフローの自動化
- **モニタリング**: クリティカルなユーザーフローの定期チェック
- **データ収集**: スクレイピングやフォーム自動化
- **リグレッションテスト**: 変更後の機能検証
- **オンボーディング**: セットアッププロセスの文書化と自動化

## ワークフロー例

### ログインテスト

```bash
/workflow:create "login-test"
→ ログインフローをテストするインタラクティブステップ
→ /login-test として保存
```

### 価格モニター

```bash
/workflow:create "check-price"
→ 商品ページに移動
→ 価格要素を抽出
→ スクリーンショットを撮影
→ /check-price として保存
```

## ヒント

1. **具体的に**: 正確な選択のために要素を明確に記述
2. **スナップショットを使用**: 要素選択前にページスナップショットを確認
3. **待機を追加**: 動的コンテンツには待機ステップを含める
4. **都度テスト**: 各ステップは検証のために即座に実行される
5. **後から編集**: 生成されたMarkdownファイルは手動編集可能

## 制限事項

- Chrome DevTools MCPの設定が必要
- 複雑な条件分岐ロジックは手動編集が必要
- JavaScript実行はサポートされているが手動追加が必要
- 各ワークフローは新しいブラウザセッションで実行

## 関連コマンド

- `/test` - ブラウザテストを含む包括的テストを実行
- `/auto-test` - 修正付き自動テストランナー
- `/fix` - クイックバグ修正

## 技術詳細

**保存形式**: Markdown（人間が編集可能）
**実行方法**: スラッシュコマンドシステム
**MCPツール**: Chrome DevTools MCP
**自動検出**: `.claude/commands/workflows/`ディレクトリ経由

---

*生成されたワークフローは再起動なしで即座にスラッシュコマンドとして利用可能。*
