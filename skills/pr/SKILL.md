---
name: pr
description: Analyze branch changes and generate comprehensive PR description. Use when
  user mentions PR作って, プルリクエスト, pull request, PR作成.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npx:*), Bash(ffmpeg:*), Task, AskUserQuestion
model: opus
argument-hint: "[issue reference or context] [--visual]"
user-invocable: true
---

# /pr - Pull Request Description Generator

Analyze all changes in the current branch and generate comprehensive PR
descriptions.

## Input

- Issue reference or context: `$1` (optional, e.g., `#456`)
- `--visual` flag: run E2E recording and attach mp4 to PR
- If `$1` is empty → generate from current branch only

## Agent

| Type  | Name         | Purpose                          |
| ----- | ------------ | -------------------------------- |
| Agent | pr-generator | PR description generation (fork) |

## Execution

| Step | Action                                                                             |
| ---- | ---------------------------------------------------------------------------------- |
| 1    | Analyze: `git status`, `git diff`, `git log` (parallel)                            |
| 2    | Select base branch via AskUserQuestion (options: main / develop / [detected])      |
| 3    | If `--visual`: run E2E recording (see Visual Recording section)                    |
| 4    | `Task` with `subagent_type: pr-generator`, `mode: "dontAsk"` for PR content        |
| 5    | Preview PR → AskUserQuestion: "Create this PR?"                                    |
| 6    | Display push command for user to run manually                                      |
| 7    | Create PR: `gh pr create --title "..." --body "..."`                               |
| 8    | If `--visual` and mp4 exists: show attach instruction (see Visual Recording below) |

### Push (Manual)

Never execute `git push` directly. Display the command and wait for
confirmation:

```text
Run this to push: git push -u origin HEAD
```

## Visual Recording

Triggered by `--visual` flag. Abort silently if `playwright.config.*` not found.

| Step | Action                                                                       |
| ---- | ---------------------------------------------------------------------------- |
| 1    | Check `playwright.config.ts` or `playwright.config.js` exists (project root) |
| 2    | Run: `npx playwright test --video=on`                                        |
| 3    | Find latest `.webm` in `test-results/`                                       |
| 4    | Convert: `ffmpeg -i <input.webm> -vcodec libx264 <output.mp4>`               |
| 5    | Store mp4 path → show after PR creation                                      |

After PR creation, display:

```text
Video generated: <absolute path to mp4>
Drag and drop it into the PR description or first comment on GitHub.
```

## Rules

| Rule                | Detail                                        |
| ------------------- | --------------------------------------------- |
| Title: No prefix    | No `feat:`, `fix:`, `refactor:` etc.          |
| Body: Direct string | Avoid heredoc (`<<EOF`) - sandbox restriction |

## Display Format

Preview shows title, base branch, current branch, summary bullets, and changes
table. Success: `**Created PR**: #<number> <title> <PR URL>`

## Verification

| Check                                             | Required |
| ------------------------------------------------- | -------- |
| `Task` called with `subagent_type: pr-generator`? | Yes      |
| Title has no prefix (`feat:`, `fix:`, etc.)?      | Yes      |
| `--visual` without playwright.config → aborted?   | Yes      |
