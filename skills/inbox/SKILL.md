---
name: inbox
description: Check your inbox across GitHub, Slack, and Google Calendar. Use when user mentions inbox, タスク確認, 自分のissue, my tasks, 関連タスク, 未読確認, 今日のタスク.
allowed-tools: Bash(gh:*), Bash(curl:*), Bash(jq:*), Bash(date:*), Bash(gemini:*), Bash(which:*), Read
model: sonnet
argument-hint: "[github|slack|calendar|all] [--days N]"
user-invocable: true
---

# /inbox - Task Aggregator

## Input

- Source filter: `$1` (optional: `github`, `slack`, `calendar`, `all`. Default: `all`)
- Period: parse `--days N` from `$ARGUMENTS` → set `DAYS` variable (default: 7)

## Execution

Run all source queries **in parallel**.

### GitHub

All commands use `--json repository,title,number,updatedAt,url`:

| Priority | Query            | Filter                                                                                                |
| -------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| 1        | Review Requested | `gh search prs --review-requested @me --state open --limit 15`                                        |
| 2        | Assigned Issues  | `gh search issues --assignee @me --state open --limit 15`                                             |
| 3        | My PRs           | `gh search prs --author @me --state open --limit 15`                                                  |
| 4        | Recent Mentions  | `gh search issues --mentions @me --state open --updated ">=$(date -v-${DAYS}d +%Y-%m-%d)" --limit 10` |

Dedup: item in multiple categories → show in highest-priority only.

### Slack

Requires: `$SLACK_TOKEN` (xoxp-...) and `$SLACK_WORKSPACE` env vars. See skill `accessing-slack` for details.

1. Verify `$SLACK_TOKEN` is set — if not, skip with setup hint
2. Search: `curl -s -G -H "Authorization: Bearer $SLACK_TOKEN" --data-urlencode "query=to:me after:$(date -v-${DAYS}d +%Y-%m-%d)" -d "count=10" -d "sort=timestamp" "https://slack.com/api/search.messages"`
3. Parse with `jq`: extract `.messages.matches[]` → `{channel: .channel.name, user: .username, text, ts, permalink}`

Link: use `permalink` from API response.

### Google Calendar

1. `which gemini` — if not installed, skip with setup hint
2. `gemini -p "List my Google Calendar events from $(date +%Y-%m-%d) to $(date -v+${DAYS}d +%Y-%m-%d). Output as TSV: date, time, title. No explanation." -y -e google-workspace`

## Output

Header: `Inbox Summary (YYYY-MM-DD)`. Footer: period and source availability.

Per source, show categorized tables: `| Repo | [#N Title](url) | Updated |` (GitHub), `| Channel | From | Message | Time |` (Slack), `| Time | Event | Link |` (Calendar).

## Rules

| Rule            | Detail                                  |
| --------------- | --------------------------------------- |
| Titles          | ≤30 chars, drop decorative prefixes     |
| Repo name       | `repo` only (not `org/repo`)            |
| Time            | Compact: `2h`, `1d`, `02-05` (no "ago") |
| Slack messages  | Last name, ≤30 char, group by thread    |
| Empty category  | Omit section                            |
| All empty       | "No pending items" for that source      |
| Unavailable     | Skip, note in footer with setup hint    |
| `gh` not authed | Show: run `gh auth login`               |
| Partial failure | Show completed results with note        |
