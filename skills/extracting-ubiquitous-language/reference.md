# Extracting Ubiquitous Language Reference

API examples and output templates referenced by SKILL.md during execution.

## Slack API Examples

### Channel History

```bash
curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
  "https://slack.com/api/conversations.history?channel=$CHANNEL&oldest=$OLDEST_TS&limit=200" \
  | jq 'if .ok then [.messages[] | {text, ts, user}] else "Error: \(.error)" end'
```

### Keyword Search (when keywords provided)

```bash
curl -s -G -H "Authorization: Bearer $SLACK_TOKEN" \
  --data-urlencode "query=in:#$CHANNEL $KEYWORD" \
  -d "count=100" \
  "https://slack.com/api/search.messages" \
  | jq 'if .ok then [.messages.matches[] | {text, ts, channel: .channel.name, user}] else "Error: \(.error)" end'
```

### Thread Expansion

For messages with `reply_count > 0`, fetch thread replies — threads often
contain clarifications and definitions.

```bash
curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
  "https://slack.com/api/conversations.replies?channel=$CHANNEL&ts=$TS" \
  | jq 'if .ok then [.messages[] | {text, ts, user}] else "Error: \(.error)" end'
```

### Pagination

Use `response_metadata.next_cursor` to paginate. Max 5 pages per channel to
bound context size.

## Extraction Output Template

For each conversation batch, produce structured output:

```markdown
### Extracted Terms

| Term     | Definition                 | Code Mapping                               | Confidence | Evidence               | Ref Mapping                                              | Synonyms     |
| -------- | -------------------------- | ------------------------------------------ | ---------- | ---------------------- | -------------------------------------------------------- | ------------ |
| メンバー | 有料プラン契約者           | User where subscriptionStatus === 'active' | high       | slack:#{channel}/p{ts} | design-doc.md: 「メンバー = 有料プラン契約済みユーザー」 | 有料ユーザー |
| ゲスト   | 未登録・未ログインユーザー | —                                          | medium     | slack:#{channel}/p{ts} | —                                                        | —            |
```

## Glossary Template

### New Glossary

```markdown
# Domain Glossary

> Auto-generated from Slack conversations ({channels}, {date_range}). Review and
> refine before use.

| Term | Definition | Code Mapping | Confidence | Source | Ref |
| ---- | ---------- | ------------ | ---------- | ------ | --- |
| ...  | ...        | ...          | ...        | ...    | ... |

## Synonyms

| Canonical Term | Synonyms |
| -------------- | -------- |
| ...            | ...      |

## Ambiguous Terms

Terms that need team clarification:

| Term | Why Ambiguous | Suggested Action |
| ---- | ------------- | ---------------- |
| ...  | ...           | ...              |
```

### Merge Mode

When existing glossary provided:

1. Read existing glossary
2. Identify new terms not in existing
3. Identify updated definitions for existing terms
4. Present diff to user via AskUserQuestion before writing
