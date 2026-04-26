# SOW解決

`$1`: 呼び出し元スラッシュコマンドの第1引数（例: `/code "ログイン追加"` → `$1 = "ログイン追加"`）。

## 探索

1. `.claude/workspace/.current-sow` で追跡中のSOWパスを確認
2. 見つからない場合 → `Glob(".claude/workspace/planning/*/sow.md")`
3. ディレクトリ名の日付で最新を選択（`YYYY-MM-DD-*`、新しい順）
4. 同じ最新日付のSOWが2件以上ある場合 → AskUserQuestionで選択
5. 見つかった場合 → SOW + 対応する `spec.md` を読み込み
6. 抽出: Acceptance Criteria、Implementation Plan、Constraints

## SOW状態

| 状態           | 動作                                                  |
| -------------- | ----------------------------------------------------- |
| SOW + spec     | AC + Implementation Planが実装を駆動                  |
| SOW のみ       | ACが実装を駆動、`$1` が実装詳細を補完                 |
| SOW なし       | `$1` が唯一の指示                                     |
| `$1` が競合    | SOWが優先; AskUserQuestionでユーザーに競合を通知      |

## ステータス更新

SOWがある場合: `draft` or `completed` → `in-progress` に更新
