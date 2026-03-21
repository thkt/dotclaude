# Session Start

Applies to: ~/.claude sessions only.

## Workflow

| Step | Action                          | Detail                                          |
| ---- | ------------------------------- | ----------------------------------------------- |
| 1    | Read `BACKLOG.md`               | Check Active Focus and per-project status        |
| 2    | Check `blocked` tasks           | Verify if external blockers have been resolved   |
| 3    | Present `next` tasks            | Show candidates — wait for user decision         |
| 4    | Update `BACKLOG.md` on complete | Record status change and date                    |

## Constraints

| Rule            | Detail                                               |
| --------------- | ---------------------------------------------------- |
| No auto-start   | Present options, never auto-start tasks              |
| Update on close | When a task is done, update BACKLOG.md before session end |
