---
name: watch
description: Start Discord auto-response loop. Use when user mentions watch, discord watch, auto-response.
allowed-tools: CronCreate, CronDelete, CronList, mcp__plugin_discord_discord__fetch_messages, mcp__plugin_discord_discord__reply, mcp__plugin_discord_discord__react, mcp__plugin_discord_discord__edit_message
model: sonnet
argument-hint: "[interval] [channel_id]"
user-invocable: true
---

# /watch - Discord Auto-Response Loop

Start a `/loop` that monitors Discord DM channels and auto-responds to new messages.

## Input

- `$1`: interval (optional, default: `1m`). Supports `Ns`, `Nm`, `Nh` format.
- `$2`: channel_id (optional). If omitted, read all channel IDs from `~/.claude/channels/discord/access.json` `allowFrom` entries and check approved channels.

## Execution

1. Parse interval from `$ARGUMENTS` (default `1m`).
2. If no channel_id given, read `~/.claude/channels/discord/access.json` and find active DM channels from `~/.claude/channels/discord/approved/` directory (file contents = chatId).
3. Convert interval to cron expression:
   - `1m` → `*/1 * * * *`
   - `5m` → `*/5 * * * *`
   - `Nm` where N <= 59 → `*/N * * * *`
   - `Nh` → `0 */N * * *`
4. Call CronCreate with:
   - `cron`: the expression
   - `prompt`: the monitoring prompt (below)
   - `recurring`: true
5. Confirm: job ID, interval, channels being watched, 7-day auto-expiry, CronDelete to stop.
6. Run the monitoring prompt once immediately.

## Monitoring Prompt Template

For each channel:

```
Check Discord channel {channel_id} for new messages using fetch_messages. Reply to any new messages not from me. Do not re-reply to already-replied messages. If no new messages, do nothing.
```

## Stop

If user says "stop":

1. Call CronList to find the watch job.
2. Call CronDelete with the job ID.
3. Confirm stopped.
