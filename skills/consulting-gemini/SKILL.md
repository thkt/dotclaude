---
name: consulting-gemini
description: >
  Consult Google Gemini CLI for plan review, implementation check, and research.
  Use when needing second opinion on plans, verifying implementation approach,
  or when user mentions 計画レビュー, 実装確認, 調査依頼, Geminiに相談.
allowed-tools: [Bash, Read]
user-invocable: false
---

# Consulting Gemini

## Command

```bash
gemini "[prompt]" --output-format text --sandbox
```

## Rules

- Present to user: never blindly follow suggestions
- Verify: Gemini may have outdated data
- Fallback: if CLI fails, continue workflow
