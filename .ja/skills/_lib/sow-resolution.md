# SOW Resolution

`$ARGUMENTS`: 呼び出し元 slash コマンドの引数文字列全体 (例: `/code "add login"` → `$ARGUMENTS = "add login"`)。

## Discovery

1. `.claude/workspace/.current-sow` を確認し、追跡中の SOW パスを取得
2. 見つからなければ `Glob(".claude/workspace/planning/*/sow.md")`
3. ディレクトリ名の日付 (`YYYY-MM-DD-*`, 新しい順) で最新を選択
4. 同一最新日付に SOW が 2 件以上ある場合、AskUserQuestion で選択
5. 見つかったら SOW と対応する `spec.md` を読む
6. 抽出: Acceptance Criteria, Implementation Plan, Constraints

## SOW State

| 状態              | 振る舞い                                           |
| ----------------- | -------------------------------------------------- |
| SOW + spec        | AC + Implementation Plan が実装を駆動              |
| SOW のみ          | AC が実装を駆動、`$ARGUMENTS` が実装詳細を補完     |
| SOW なし          | `$ARGUMENTS` が唯一の指示                          |
| `$ARGUMENTS` 衝突 | SOW を優先。AskUserQuestion でユーザーに衝突を通知 |

## Status Update

SOW が存在する場合: `draft` または `completed` を `in-progress` に更新。
