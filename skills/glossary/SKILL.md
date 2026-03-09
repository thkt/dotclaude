---
name: glossary
description:
  Extract ubiquitous language from Slack and generate domain glossary. Use when
  user mentions 用語集, glossary, ユビキタス言語, ドメイン用語, Slack から用語.
allowed-tools: Bash, Read, Write, Glob, Grep, AskUserQuestion
model: opus
argument-hint: "[#channel-name or search keywords]"
user-invocable: true
---

# /glossary - Ubiquitous Language Extractor

Extract domain terms from Slack conversations and generate a glossary.

## Input

- `$1` (optional): Slack channel name(s) or search keywords
- `--refs` (optional): Reference materials (md paths, Google Docs/Sheets URLs)
- If empty → Phase 1 asks via AskUserQuestion

## Execution

| Phase | Action                  | Description                            |
| ----- | ----------------------- | -------------------------------------- |
| 1     | Scope definition        | Channels, time range, keywords, output |
| 2     | Conversation harvesting | Fetch Slack messages and threads       |
| 3     | Term extraction         | Analyze conversations for domain terms |
| 4     | Code cross-reference    | Match terms to code identifiers        |
| 5     | Glossary generation     | Write structured glossary markdown     |

Follow skill `extracting-ubiquitous-language` for detailed steps.

## Quick Start Examples

```
/glossary #dev #product
/glossary #dev --refs docs/design.md,https://docs.google.com/document/d/xxx
/glossary 決済 注文 ユーザー
/glossary
```

## Output

File: `docs/domain/glossary.md` (default, configurable in Phase 1)

## Verification

| Check                                | Required |
| ------------------------------------ | -------- |
| All terms have confidence markers?   | Yes      |
| Ambiguous terms listed separately?   | Yes      |
| Slack sources cited for definitions? | Yes      |
| User reviewed before final write?    | Yes      |
