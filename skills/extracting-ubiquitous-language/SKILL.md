---
name: extracting-ubiquitous-language
description: >
  Extract ubiquitous language from Slack conversations and generate domain
  glossary. Use when building domain glossary from team conversations, or when
  user mentions ユビキタス言語, 用語集, glossary, ubiquitous language,
  ドメイン用語.
allowed-tools: [Bash, Read, Write, Glob, Grep, AskUserQuestion]
user-invocable: false
---

# Extracting Ubiquitous Language

Extract domain terms from Slack conversations and generate a glossary draft.

## Prerequisites

| Variable          | Description                               |
| ----------------- | ----------------------------------------- |
| `SLACK_TOKEN`     | User OAuth Token (`xoxp-...`)             |
| `SLACK_WORKSPACE` | Workspace subdomain (before `.slack.com`) |

Verify `SLACK_TOKEN` is set before any API call.

## Phase 1: Scope Definition

Ask via AskUserQuestion:

| Question            | Options / Input                                             |
| ------------------- | ----------------------------------------------------------- |
| Slack channels      | Channel names or IDs (comma-separated)                      |
| Time range          | 1 week / 1 month / 3 months / 6 months                      |
| Search keywords     | Optional domain keywords to focus extraction                |
| Reference materials | md paths, Google Docs/Sheets URLs (comma-separated or none) |
| Output path         | Default: `docs/domain/glossary.md`                          |
| Existing glossary?  | Path to existing file (merge mode) or none (new)            |

## Phase 2: Conversation Harvesting

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

## Phase 2.5: Reference Material Loading

When reference materials are specified, load them as additional context for term
extraction.

| Source         | How to load                                     |
| -------------- | ----------------------------------------------- |
| Local md files | Read tool                                       |
| Google Docs    | `accessing-google-workspace` skill (gcloud CLI) |
| Google Sheets  | `accessing-google-workspace` skill (gcloud CLI) |

Reference materials are NOT embedded into kiku's DB. They serve as
cross-reference context during Phase 3 term extraction — helping the LLM
validate discovered terms against formal documentation.

## Phase 3: Term Extraction

Analyze harvested conversations in batches. For each batch, extract:

| Extract           | Signal patterns                                                     |
| ----------------- | ------------------------------------------------------------------- |
| Term candidates   | Nouns/phrases repeated across multiple messages                     |
| Definitions       | "X means Y", "X is Y", "X = Y", "X って Y のこと"                   |
| Synonyms          | "X (or Y)", "X aka Y", "X とも言う"                                 |
| Corrections       | "X じゃなくて Y", "not X but Y" — shows which term is canonical     |
| Code references   | Backtick-wrapped identifiers that map to business terms             |
| Ambiguity signals | "X って何？", "what do you mean by X" — terms needing clarification |

### Extraction Prompt Structure

For each conversation batch, produce structured output:

```yaml
terms:
  - term: "メンバー"
    definition: "有料プラン契約者"
    code_mapping: "User where subscriptionStatus === 'active'"
    confidence: high
    evidence: "slack:#{channel}/p{ts}"
    ref_mapping: "design-doc.md: 「メンバー = 有料プラン契約済みユーザー」"
    synonyms: ["有料ユーザー"]
  - term: "ゲスト"
    definition: "未登録・未ログインユーザー"
    code_mapping: null
    confidence: medium
    evidence: "slack:#{channel}/p{ts}"
    ref_mapping: null
```

When reference materials are loaded (Phase 2.5), cross-reference each candidate
term against the reference content. `ref_mapping` cites where the term appears
in reference materials, boosting confidence when formal docs corroborate Slack
usage.

### Confidence Levels

| Level  | Criteria                                       |
| ------ | ---------------------------------------------- |
| high   | Explicit definition found in conversation      |
| medium | Inferred from usage context across 2+ messages |
| low    | Single mention, definition is speculative      |

## Phase 4: Code Cross-Reference (Optional)

If a project codebase is available, cross-reference extracted terms:

1. Search for term candidates in type names, interfaces, enums, constants
2. Match Slack terms to code identifiers
3. Fill `code_mapping` field in extraction output

Use Grep for exact identifier matches.

## Phase 5: Glossary Generation

### New Glossary

Write to output path using this format:

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

## Output Verifiability

| Field      | Standard                                          |
| ---------- | ------------------------------------------------- |
| Definition | Cite Slack source: `slack:#{channel}/p{ts}`       |
| Confidence | Mark per confidence level table                   |
| Ambiguity  | List in separate section, never guess definitions |

## Error Handling

| Error                     | Action                                          |
| ------------------------- | ----------------------------------------------- |
| `SLACK_TOKEN` not set     | Report and stop                                 |
| Channel not accessible    | Report channel, suggest checking permissions    |
| No terms extracted        | Report "No domain terms found in scope"         |
| Too many messages (>1000) | Suggest narrowing time range or adding keywords |
