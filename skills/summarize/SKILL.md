---
name: summarize
description: Summarize a URL article with key points and project relevance.
  Use when user shares a URL and wants a summary, or mentions 要約, まとめて, summarize.
allowed-tools: Bash(scout:*), Read, AskUserQuestion
model: sonnet
context: fork
argument-hint: "<url>"
user-invocable: true
---

# /summarize - URL Article Summarization

Fetch an article by URL and summarize it.

## Input

- URL: `$1` (required)
- If `$1` is empty, prompt via AskUserQuestion

## Execution

1. Fetch the article: `scout fetch "$1"`
2. Produce the summary

## Output Format

Print directly to conversation (no file output).

```
## {{Title}}

Author: {{Author or "N/A"}}

### Key Points

- {{point 1}}
- {{point 2}}
- {{point 3}}
- {{point 4}}
- {{point 5}}

### Relevance

| Project | Relevance |
| ------- | --------- |
| gates   | {{one line or "---"}} |
| shields | {{one line or "---"}} |
| yomu    | {{one line or "---"}} |
| mado    | {{one line or "---"}} |

### Verdict

{{one-line overall takeaway}}
```

## Rules

| Rule | Detail |
| ---- | ------ |
| Key points | Exactly 5. Concrete, not vague |
| Relevance | Connect to specific functionality, not generic "could be useful" |
| Verdict | One sentence. Opinionated |
| No fluff | No "this article discusses..." preamble |
