# 一般的なブラウザ自動化パターン

ブラウザ自動化タスク用の再利用可能なパターン。

## セットアップパターン

常に以下から開始:

```markdown
1. tabs_context_mcp → 利用可能なタブを取得
2. tabs_create_mcp (必要な場合) → 新しいタブを作成
3. navigate → ターゲットURLに移動
4. read_page → ページ構造を理解
```

## フォーム入力パターン

### シンプルなフォーム

```markdown
1. read_page filter: "interactive"
2. 入力refを特定
3. 各フィールドにform_input
4. find "送信ボタン"
5. computer action: "left_click" ref: submit_ref
```

### マルチステップフォーム

```markdown
1. 最初のセクションを入力
2. computer action: "left_click" ref: next_button
3. wait duration: 2 (ページ遷移のため)
4. read_page (構造を更新)
5. 次のセクションを入力
6. 繰り返し...
```

## 検索パターン

```markdown
1. find "検索入力"
2. form_input ref: search_ref, value: "クエリ"
3. computer action: "key", text: "Enter"
4. wait duration: 2
5. read_page (結果を取得)
```

## ログインパターン

```markdown
1. ログインページに移動
2. find "ユーザー名入力"
3. ユーザー名をform_input
4. find "パスワード入力"
5. パスワードをform_input
6. find "ログインボタン"
7. computer action: "left_click"
8. wait duration: 3
9. ログイン成功を検証
```

**注意**: パスワードの自動入力は絶対にしない - ユーザー入力を促す。

## データ抽出パターン

### テーブルデータ

```markdown
1. read_page
2. アクセシビリティツリーからテーブル構造を特定
3. ツリーデータから行/セルを抽出
4. 構造化データを処理
```

### 記事コンテンツ

```markdown
1. get_page_text → クリーンなテキストコンテンツ
2. または read_page depth: 5 で構造取得
```

## スクリーンショット文書化パターン

```markdown
1. ターゲットに移動
2. wait duration: 2 (レンダリングを待つ)
3. computer action: "screenshot"
4. スクリーンショットを分析/保存
```

## GIF録画パターン

### 完全なワークフロー録画

```markdown
1. gif_creator action: "start_recording"
2. computer action: "screenshot" (初期状態)
3. アクション1を実行
4. computer action: "screenshot"
5. アクション2を実行
6. computer action: "screenshot"
7. ... スクリーンショット付きでさらにアクション ...
8. computer action: "screenshot" (最終状態)
9. gif_creator action: "stop_recording"
10. gif_creator action: "export", download: true, filename: "workflow.gif"
```

### 良いGIFのためのヒント

- 重要なアクションごとにスクリーンショットを撮る
- アニメーションが完了するのを待つ
- 意味のあるファイル名を使用
- 品質設定を考慮（低い = 高品質だがファイルサイズ大）

## エラーハンドリングパターン

### 要素が見つからない

```markdown
1. find "ターゲット要素"
2. 見つからない場合:
   - 代替クエリを試す
   - スクロールしてリトライ: scroll_toまたはscrollアクション
   - read_pageのdepthを増やす
3. それでも見つからない場合:
   - デバッグ用にスクリーンショットを撮る
   - ユーザーに報告
```

### ページがロードされない

```markdown
1. URLに移動
2. wait duration: 5
3. read_page
4. 空/エラーの場合:
   - read_console_messagesでエラーを確認
   - read_network_requestsで失敗を確認
   - 問題を報告
```

## マルチページワークフローパターン

```markdown
1. ドメインリストでupdate_plan
2. ユーザー承認を待つ
3. 各ページに対して:
   - navigate
   - ロードを待つ
   - アクションを実行
   - 成功を検証
```

## レスポンシブテストパターン

```markdown
1. resize_window width: 1920, height: 1080
2. computer action: "screenshot" (デスクトップ)
3. resize_window width: 768, height: 1024
4. computer action: "screenshot" (タブレット)
5. resize_window width: 375, height: 812
6. computer action: "screenshot" (モバイル)
```

## デバッグパターン

```markdown
1. 問題を特定
2. read_console_messages pattern: "error" (JSエラーを確認)
3. read_network_requests urlPattern: "api" (API呼び出しを確認)
4. computer action: "screenshot" (視覚的状態)
5. javascript_toolでページ状態を確認
```

## ベストプラクティス

### 常に行うこと

- `tabs_context_mcp`から開始
- ページロードを待つ（`wait`アクション）
- 重要なアクションの前後でスクリーンショットを撮る
- 可能な場合は`coordinate`より`ref`を使用
- エラーを適切に処理

### 絶対に行わないこと

- タブコンテキスト確認をスキップ
- 機密データを含むフォームを自動送信
- ターゲットを確認せずにクリック
- CAPTCHA/ボット検出を無視
- ページ構造が一定だと想定
