# Session Start

Applies to: ~/.claude sessions only.

## Workflow

| Step | Action                          | Detail                                          |
| ---- | ------------------------------- | ----------------------------------------------- |
| 1    | Read `BACKLOG.md`               | Per-project status and deadline check            |
| 2    | Read `pending.md`               | `~/.claude/workspace/inbox/pending.md` (なければスキップ) |
| 3    | Present pending tasks           | 「新しく拾ったタスクN件」→ 採用 or 棄却を確認   |
| 4    | Check `blocked` tasks           | Verify if external blockers have been resolved   |
| 5    | Present `next` tasks            | Show candidates — wait for user decision         |
| 6    | Update `BACKLOG.md` on complete | Record status change and date                    |

### Pending task triage (Step 3)

- 採用: BACKLOG.mdの該当セクションに行追加 → pending.mdから削除
- 棄却: pending.mdから削除のみ
- 保留: 何もしない（次回セッションで再提示）
- 全件処理後、pending.mdが空ならファイル削除

## Constraints

| Rule            | Detail                                               |
| --------------- | ---------------------------------------------------- |
| No auto-start   | Present options, never auto-start tasks              |
| Update on close | When a task is done, update BACKLOG.md before session end |
| Pending is optional | pending.md がなくても通常通り進行              |
