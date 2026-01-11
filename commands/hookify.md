---
description: Create custom hooks to prevent unwanted behaviors
allowed-tools: Read, Write, Glob
model: inherit
dependencies: [creating-hooks]
---

# /hookify - Custom Hook Creator

Create hooks that block or warn about specific patterns.

## Workflow Reference

**Skill details**: [@../skills/creating-hooks/SKILL.md](../skills/creating-hooks/SKILL.md)

## Usage

```bash
/hookify Don't use console.log in TypeScript files
/hookify Block rm -rf commands
/hookify                    # Auto-detect from conversation
```

## Rule File Format

```yaml
---
name: rule-name
enabled: true
event: file|bash|stop|prompt
pattern: regex-pattern
action: warn|block
conditions: # optional
  - field: file_path|new_text|command
    operator: regex_match|contains
    pattern: pattern
---
Message shown when pattern is detected.
```

## Events

| Event    | Trigger                   |
| -------- | ------------------------- |
| `file`   | Edit/Write operations     |
| `bash`   | Bash command execution    |
| `stop`   | When Claude wants to stop |
| `prompt` | User prompt submission    |

## Actions

| Action  | Behavior               |
| ------- | ---------------------- |
| `warn`  | Show warning, continue |
| `block` | Block operation        |

## Examples

**Block dangerous commands**:

```yaml
name: block-dangerous-rm
event: bash
pattern: rm\s+-rf
action: block
```

**Warn about debug code**:

```yaml
name: warn-console-log
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.tsx?$
  - field: new_text
    operator: contains
    pattern: console\.log
```

## Related

- `/hookify:list` - Show all rules
- `/hookify:configure` - Enable/disable rules
