---
name: creating-hooks
description: >
  Custom hook creation for preventing unwanted behaviors in Claude Code.
  Triggers: hook, hookify, rule, block, warn, prevent, pattern, detect,
  unwanted behavior, dangerous command, coding standards
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Hookify - Custom Hook Creation

## Purpose

Create declarative rules to block dangerous operations or warn about potential issues.

## Rule File Format

```yaml
---
name: rule-name
enabled: true
event: file|bash|stop|prompt|all
pattern: regex-pattern  # simple rules
action: warn|block
conditions:  # complex rules (optional)
  - field: file_path|new_text|command|user_prompt
    operator: regex_match|contains|not_contains
    pattern: pattern-to-match
---

Message shown when pattern matches (supports **Markdown**).
```

## Event Types

| Event | When Triggered | Use Case |
|-------|---------------|----------|
| `file` | Edit/Write | Code patterns, debug code |
| `bash` | Bash commands | Dangerous commands |
| `stop` | Claude stops | Require tests before done |
| `prompt` | User message | Input validation |

## Actions

| Action | Behavior | Exit Code |
|--------|----------|-----------|
| `warn` | Show message, continue | 0 |
| `block` | Show message, stop | 2 |

## Field Reference

| Event | Fields |
|-------|--------|
| file | `file_path`, `new_text`, `old_text`, `content` |
| bash | `command` |
| prompt | `user_prompt` |
| stop | `transcript` |

## Common Patterns

| Pattern | Matches |
|---------|---------|
| `rm\s+-rf` | rm -rf commands |
| `console\.log\(` | console.log statements |
| `\.env$` | .env files |
| `chmod\s+777` | chmod 777 |

## Rule Management

| Location | Scope |
|----------|-------|
| `.claude/hookify.*.local.md` | Project |
| `~/.claude/hookify.*.local.md` | Global |

**Commands**: `/hookify [desc]`, `/hookify:list`, `/hookify:configure`

## Best Practice

Start with `warn`, upgrade to `block` if needed. Use specific patterns to avoid false positives.

## References

- Command: `/hookify`, `/hookify:list`, `/hookify:configure`
- Related: `reviewing-security` (detect dangerous patterns)
