---
description: Create custom hooks to prevent unwanted behaviors
---

# /hookify - Custom Hook Creator

Create hooks that block or warn about specific patterns in code.

## Usage

### With argument (explicit instruction)

```text
/hookify Don't use console.log in TypeScript files
```

Creates a hook rule file at `.claude/hookify.{name}.local.md`

### Without argument (auto-detect from conversation)

```text
/hookify
```

Analyzes recent conversation to detect patterns you've corrected and creates rules.

## Process

1. **Analyze request**: Understand what pattern to detect
2. **Generate rule**: Create hook configuration in YAML frontmatter + Markdown
3. **Save file**: Write to `.claude/hookify.{rule-name}.local.md`
4. **Confirm**: Show the created rule

## Rule File Format

```yaml
---
name: rule-name
enabled: true
event: file|bash|stop|prompt
pattern: regex-pattern
action: warn|block
conditions:  # optional, for complex rules
  - field: file_path|new_text|command
    operator: regex_match|contains|not_contains
    pattern: pattern
---

Message shown when pattern is detected.
Markdown formatting supported.
```

## Events

| Event | Trigger |
|-------|---------|
| `file` | Edit/Write/MultiEdit operations |
| `bash` | Bash command execution |
| `stop` | When Claude wants to stop |
| `prompt` | User prompt submission |

## Actions

| Action | Behavior |
|--------|----------|
| `warn` | Show warning, continue operation |
| `block` | Block operation, require fix |

## Examples

### Block dangerous commands

```text
/hookify Block rm -rf commands
```

Creates:

```yaml
---
name: block-dangerous-rm
enabled: true
event: bash
pattern: rm\s+-rf
action: block
---
Dangerous rm -rf command detected! Use safer alternatives.
```

### Warn about debug code

```text
/hookify Warn when console.log is added to TypeScript files
```

Creates:

```yaml
---
name: warn-console-log
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
  - field: new_text
    operator: contains
    pattern: console\.log
---
Debug code detected! Remember to remove before committing.
```

## Related Commands

- `/hookify:list` - Show all hook rules
- `/hookify:configure` - Enable/disable rules interactively

## Skill Reference

[@~/.claude/skills/hookify/SKILL.md](~/.claude/skills/hookify/SKILL.md)
