# agent-browserによるE2Eテスト

## テスト構造

| フェーズ | 目的                       |
| -------- | -------------------------- |
| Setup    | 開始点に移動               |
| Execute  | ユーザーアクションを実行   |
| Verify   | 期待される結果を確認       |
| Cleanup  | 必要に応じて状態をリセット |

## 一般的なシナリオ

| シナリオ   | 主要ステップ                                                  |
| ---------- | ------------------------------------------------------------- |
| Auth       | ログイン → ダッシュボード確認 → ログアウト → リダイレクト確認 |
| Form       | 移動 → フィールド入力 → 送信 → 成功確認                       |
| Navigation | ホーム → リンククリック → ページ確認 → 戻るテスト             |
| Search     | クエリ入力 → 送信 → 結果確認 → 結果クリック                   |

## 検証テクニック

| 方法    | コマンド                         | 目的             |
| ------- | -------------------------------- | ---------------- |
| Visual  | `screenshot`                     | レイアウト比較   |
| Content | `get text <sel>`                 | テキスト内容確認 |
| State   | `snapshot -i` + refs確認         | 要素の存在確認   |
| Console | `console` / `errors`             | JSエラーなし     |
| Network | `network requests --filter /api` | API呼び出し成功  |
| Trace   | `trace start` / `trace stop`     | 完全な実行記録   |

## エラーシナリオ

| テスト         | 検証内容                                 |
| -------------- | ---------------------------------------- |
| 無効なログイン | エラーメッセージ、ログインページに留まる |
| 空フォーム     | バリデーションエラー表示                 |
| 404ページ      | 404表示、「ホームへ戻る」動作            |

## テスト中のデバッグ

```bash
# 各アクション後にエラー確認:
agent-browser errors

# 失敗時はコンソール確認:
agent-browser console

# 不安定なテストにはtrace:
agent-browser trace start test.zip
# ... テストステップ実行 ...
agent-browser trace stop
# test.zipをPlaywright Trace Viewerで開く
```

## ベストプラクティス

| 原則            | ルール                                                    |
| --------------- | --------------------------------------------------------- |
| Independence    | 各テストはクリーンな状態から、依存なし                    |
| Reliability     | セレクタでなくrefsを使用、待機追加、DOM変更後は再snapshot |
| Debugging       | 重要なアクション後に`console`/`errors`を確認              |
| Maintainability | 目的を文書化、説明的な名前、1テスト1事項                  |
| Performance     | `state save/load`でauth再利用、並列化                     |

## テストセッション管理

| パターン         | コマンド                                            |
| ---------------- | --------------------------------------------------- |
| クリーンスレート | `--session test-{timestamp}`で分離                  |
| 共有認証         | `state save auth.json`を1度、各テストで`state load` |
| 並列テスト       | テストごとに異なる`--session`で競合回避             |
