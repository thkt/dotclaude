---
name: creating-hooks
description: >
  Custom hook creation for preventing unwanted behaviors in Claude Code.
  Use when: hook, hookify, rule, block, warn, prevent, pattern, detect,
  unwanted behavior, dangerous command, coding standards enforcement.
  Creates declarative rules to block dangerous operations or warn about
  potential issues. Based on Anthropic's official hookify plugin.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Hookify - Custom Hook Creation Skill

Create custom hooks to prevent unwanted behaviors in Claude Code.

## Overview

Hookify enables creating simple, declarative rules that:

- **Block** dangerous operations before they happen
- **Warn** about potential issues without blocking
- **Enforce** coding standards automatically

Based on Anthropic's official hookify plugin.

## When to Use

### Automatic Triggers

Keywords that activate this skill:

- hook, hookify, rule
- block, warn, prevent
- pattern, detect
- unwanted behavior

### Explicit Invocation

```text
/hookify [description]
```

## Rule File Format

Rules are stored as Markdown files with YAML frontmatter:

```yaml
---
name: creating-hooks
enabled: true
event: file|bash|stop|prompt|all
pattern: regex-pattern  # simple rules
action: warn|block
conditions:  # complex rules (optional)
  - field: file_path|new_text|old_text|command|user_prompt
    operator: regex_match|contains|not_contains|equals|starts_with|ends_with
    pattern: pattern-to-match
---

Message shown when pattern matches.
Supports **Markdown** formatting.
```

## Event Types

| Event | When Triggered | Common Use Cases |
|-------|---------------|------------------|
| `file` | Edit/Write/MultiEdit | Code patterns, debug code |
| `bash` | Bash commands | Dangerous commands |
| `stop` | Claude stops | Require tests before done |
| `prompt` | User message | Input validation |
| `all` | Any event | General rules |

## Actions

| Action | Behavior | Exit Code |
|--------|----------|-----------|
| `warn` | Show message, continue | 0 |
| `block` | Show message, block operation | 2 |

## Pattern Syntax (Python Regex)

| Pattern | Matches | Example |
|---------|---------|---------|
| `rm\s+-rf` | rm -rf | `rm -rf /tmp` |
| `console\.log\(` | console.log( | `console.log("test")` |
| `(eval\|exec)\(` | eval( or exec( | `eval("code")` |
| `\.env$` | Files ending in .env | `.env`, `.env.local` |
| `chmod\s+777` | chmod 777 | `chmod 777 file` |

### Tips

- `\s` = whitespace
- `\.` = literal dot
- `\|` = OR condition
- `.*` = match anything
- `^` = start of string
- `$` = end of string

## Operators Reference

| Operator | Description |
|----------|-------------|
| `regex_match` | Pattern matches (most common) |
| `contains` | String contains pattern |
| `not_contains` | String does NOT contain pattern |
| `equals` | Exact match |
| `starts_with` | String starts with pattern |
| `ends_with` | String ends with pattern |

## Field Reference

### File Events

| Field | Description |
|-------|-------------|
| `file_path` | Path of file being edited |
| `new_text` | New content being added |
| `old_text` | Content being replaced (Edit only) |
| `content` | Full file content (Write only) |

### Bash Events

| Field | Description |
|-------|-------------|
| `command` | Bash command string |

### Prompt Events

| Field | Description |
|-------|-------------|
| `user_prompt` | User's message text |

### Stop Events

| Field | Description |
|-------|-------------|
| `transcript` | Full conversation transcript |

## Example Rules

### 1. Block Dangerous Commands

```yaml
---
name: creating-hooks
enabled: true
event: bash
pattern: rm\s+-rf|dd\s+if=|mkfs|format
action: block
---

🛑 **Destructive operation detected!**

This command can cause data loss. Operation blocked for safety.
```

### 2. Warn About Debug Code

```yaml
---
name: creating-hooks
enabled: true
event: file
pattern: console\.log\(|debugger;|print\(
action: warn
---

🐛 **Debug code detected**

Remember to remove debugging statements before committing.
```

### 3. TypeScript-specific Console.log

```yaml
---
name: creating-hooks
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
  - field: new_text
    operator: contains
    pattern: console.log
---

⚠️ **console.log in TypeScript**

Consider using a proper logging library instead.
```

### 4. Require Tests Before Stopping

```yaml
---
name: creating-hooks
enabled: false
event: stop
action: block
conditions:
  - field: transcript
    operator: not_contains
    pattern: npm test|vitest|jest
---

🧪 **Tests not detected!**

Please run tests before completing the task.
```

### 5. Sensitive File Protection

```yaml
---
name: creating-hooks
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.env$|credentials|secrets
  - field: new_text
    operator: contains
    pattern: KEY|SECRET|PASSWORD
---

🔐 **Sensitive file edit detected!**

Ensure credentials are not hardcoded and file is in .gitignore.
```

## Rule Management

### File Location

Rules are stored in `.claude/hookify.{name}.local.md`

### Commands

| Command | Description |
|---------|-------------|
| `/hookify [desc]` | Create new rule |
| `/hookify:list` | Show all rules |
| `/hookify:configure` | Enable/disable rules |

### Manual Management

```bash
# Disable rule: change enabled: false in file
# Delete rule: move to Trash (per CLAUDE.md P4)
mv .claude/hookify.my-rule.local.md ~/.Trash/
```

## Integration

### Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│ Claude Code Tool Execution                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. Tool invoked (Edit/Write/Bash/etc)                      │
│    ↓                                                        │
│ 2. settings.json PreToolUse hooks                          │
│    ├─ ~/.claude/hooks/frontend-security-hook.py          │
│    └─ Other system hooks                                    │
│    ↓                                                        │
│ 3. Hookify rules (.claude/hookify.*.local.md)              │
│    ├─ Pattern matching against tool input                  │
│    └─ warn/block actions                                    │
│    ↓                                                        │
│ 4. Tool executes (if not blocked)                          │
└─────────────────────────────────────────────────────────────┘
```

**Note**: Hookify rules are now **fully implemented** with the `hookify-processor.py` hook. Rules are automatically processed for Write/Edit/MultiEdit/Bash operations via settings.json PreToolUse hook.

### With settings.json

Hookify rules work alongside settings.json hooks:

- settings.json: System-level hooks (Python/Bash scripts)
- Hookify: Simple pattern-based rules (no coding required)

### Rule File Locations

| Location | Scope | Use Case |
|----------|-------|----------|
| `.claude/hookify.*.local.md` | Project-local | Project-specific rules |
| `~/.claude/hookify.*.local.md` | Global | Personal rules across all projects |

**Search order**: Project-local rules are checked first, then global rules.

### Rule Priority

1. settings.json PreToolUse hooks run first
2. Hookify rules run after (project-local → global)
3. First `block` action stops the operation

## Best Practices

### Do's

- Start with `warn` action, upgrade to `block` if needed
- Use specific patterns to avoid false positives
- Document why the rule exists in the message
- Test patterns before enabling

### Don'ts

- Don't create too many rules (cognitive overhead)
- Don't use overly broad patterns
- Don't forget to disable unused rules

## Remember

> "Prevention is better than cure" - but balance strictness with usability

Start simple, refine based on actual issues encountered.
