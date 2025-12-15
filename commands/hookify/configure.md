---
description: Configure hookify rules interactively
---

# /hookify:configure - Configure Hook Rules

Enable, disable, or delete hook rules interactively.

## Process

1. **List rules** with `/hookify:list`
2. **Ask user** which rule to configure
3. **Show options**:
   - Enable rule
   - Disable rule
   - Delete rule
   - Edit rule
4. **Apply changes** to the rule file

## Interaction

```text
Which rule would you like to configure?
> 2

Selected: warn-console-log

What would you like to do?
1. Enable (currently: ❌)
2. Delete rule
3. Edit pattern
4. Cancel

> 1

✅ Rule 'warn-console-log' has been enabled.
```

## Instructions

1. First run `/hookify:list` to show available rules
2. Use AskUserQuestion to get rule selection
3. Show configuration options based on current state
4. Update YAML frontmatter in the selected file
5. Confirm changes to user
