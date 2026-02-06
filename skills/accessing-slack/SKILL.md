---
name: accessing-slack
description: >
  Access Slack messages, threads, and search via Slack API.
  Use when user shares a Slack URL (xxx.slack.com/archives/...) or mentions
  Slack, スラック, メッセージ取得, スレッド, Slack検索.
allowed-tools: [Bash, Read]
user-invocable: false
---

# Accessing Slack

Access Slack messages, threads, and search via API.

## Prerequisites

| Variable          | Description                               |
| ----------------- | ----------------------------------------- |
| `SLACK_TOKEN`     | User OAuth Token (`xoxp-...`)             |
| `SLACK_WORKSPACE` | Workspace subdomain (before `.slack.com`) |

Verify `SLACK_TOKEN` is set before any API call.

## URL Parsing

| Pattern                                              | Extraction                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `{workspace}.slack.com/archives/{CHANNEL}/p{TS_RAW}` | `CHANNEL`: after `/archives/`, `TS`: insert `.` before last 6 digits |

Reverse (generate link): remove `.` from TS, prefix with `p`.

## Commands

### Get Message

```bash
curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
  "https://slack.com/api/conversations.history?channel=$CHANNEL&latest=$TS&inclusive=true&limit=1" \
  | jq 'if .ok then .messages[0].text else "Error: \(.error)" end'
```

### Get Thread

```bash
curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
  "https://slack.com/api/conversations.replies?channel=$CHANNEL&ts=$TS" \
  | jq 'if .ok then [.messages[] | {user, text}] else "Error: \(.error)" end'
```

### Search Messages

```bash
curl -s -G -H "Authorization: Bearer $SLACK_TOKEN" \
  --data-urlencode "query=SEARCH_QUERY" \
  -d "count=5" \
  "https://slack.com/api/search.messages" \
  | jq 'if .ok then [.messages.matches[] | {channel: .channel.name, text, ts}] else "Error: \(.error)" end'
```

### Reply to Thread

Requires user confirmation before execution.

```bash
curl -s -X POST -H "Authorization: Bearer $SLACK_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg ch "$CHANNEL" --arg ts "$TS" --arg msg "MESSAGE" \
    '{channel:$ch,thread_ts:$ts,text:$msg}')" \
  "https://slack.com/api/chat.postMessage" \
  | jq 'if .ok then "Sent" else "Error: \(.error)" end'
```

## Error Handling

| Error               | Cause                    | Action                           |
| ------------------- | ------------------------ | -------------------------------- |
| `not_in_channel`    | Bot token without invite | Use User Token instead           |
| `missing_scope`     | Scope not added          | Check `needed` field in response |
| `channel_not_found` | Wrong channel ID         | Verify URL parsing               |
