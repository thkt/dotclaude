---
name: extracting-ubiquitous-language
description: >
  Slack conversation harvesting and term extraction. Internal module for
  /glossary. Use when: ユビキタス言語, 用語集, glossary, ドメイン用語.
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

Fetch channel history, keyword search, thread replies via Slack API. Paginate
with `next_cursor` (max 5 pages per channel).

→ curl examples: [reference.md](reference.md#slack-api-examples)

## Phase 2.5: Reference Material Loading

When reference materials are specified, load them as additional context for term
extraction.

| Source         | How to load                                     |
| -------------- | ----------------------------------------------- |
| Local md files | Read tool                                       |
| Google Docs    | `google-workspace` skill (gcloud CLI) |
| Google Sheets  | `google-workspace` skill (gcloud CLI) |

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

For each batch, produce a table with: Term, Definition, Code Mapping,
Confidence, Evidence, Ref Mapping, Synonyms. Cross-reference against loaded
reference materials when available.

→ Output template: [reference.md](reference.md#extraction-output-template)

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

Write glossary to output path. Includes Terms table, Synonyms table, and
Ambiguous Terms section. Merge mode: diff against existing glossary before
writing.

→ Templates: [reference.md](reference.md#glossary-template)

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
