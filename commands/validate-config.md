---
description:
  Validate configuration integrity. Use when user mentions 設定検証, config
  check, validate config.
allowed-tools: Bash
model: haiku
argument-hint: "[--fix]"
---

# /validate-config

Run `~/.claude/scripts/validate-config.sh` and report results.

## Checks

| #   | Check            | Validates                                       |
| --- | ---------------- | ----------------------------------------------- |
| 1   | Skill references | Agent skill directories exist                   |
| 2   | Agent references | Command subagent_type files exist               |
| 3   | Schema prefixes  | finding-schema PREFIX → reviewer file           |
| 4   | Model values     | Frontmatter model is haiku/sonnet/opus          |
| 5   | Orphan detection | Agents are referenced somewhere                 |
| 6   | Hook tools       | guardrails/formatter/reviews binaries available |
| 7   | Guardrail rules  | no-console, no-explicit-any in oxlintrc         |

If `--fix` is passed, suggest fixes for each error found.
