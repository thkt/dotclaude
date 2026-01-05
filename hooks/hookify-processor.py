#!/usr/bin/env python3
"""
Hookify Processor - Pattern-based rule engine for Claude Code

Processes hookify rules (.claude/hookify.*.local.md) and applies
pattern matching to block/warn about specific operations.

Exit codes:
- 0: No issues or warn action (continue)
- 2: Block action triggered (stop operation)

Rule File Format:
---
name: rule-identifier
enabled: true
event: file|bash|stop|prompt|all
pattern: regex-pattern  # simple rules
action: warn|block
conditions:  # complex rules (optional)
  - field: file_path|new_text|old_text|command|user_prompt
    operator: regex_match|contains|not_contains|equals|starts_with|ends_with
    pattern: pattern-to-match
---

Message shown when pattern matches (Markdown supported).
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

# Rule file locations
RULE_LOCATIONS = [
    Path.cwd() / ".claude",  # Project-local
    Path.home() / ".claude",  # Global
]


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith("---"):
        return {}, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    frontmatter_text = parts[1].strip()
    body = parts[2].strip()

    # Simple YAML parser for our specific format
    frontmatter = {}
    current_key = None
    current_list = None

    for line in frontmatter_text.split("\n"):
        line = line.rstrip()
        if not line:
            continue

        # List item
        if line.startswith("  - "):
            if current_list is not None:
                item_text = line[4:]
                # Parse key: value in list item
                if ":" in item_text:
                    key, value = item_text.split(":", 1)
                    if current_list and isinstance(current_list[-1], dict):
                        current_list[-1][key.strip()] = value.strip()
                    else:
                        current_list.append({key.strip(): value.strip()})
                else:
                    current_list.append(item_text.strip())
            continue

        # Continuation of list item (indented)
        if line.startswith("    ") and current_list:
            item_text = line.strip()
            if ":" in item_text and current_list and isinstance(current_list[-1], dict):
                key, value = item_text.split(":", 1)
                current_list[-1][key.strip()] = value.strip()
            continue

        # Key: value pair
        if ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()

            if not value:
                # Start of a list
                current_key = key
                current_list = []
                frontmatter[key] = current_list
            else:
                # Simple value
                current_key = None
                current_list = None
                # Handle boolean
                if value.lower() == "true":
                    value = True
                elif value.lower() == "false":
                    value = False
                frontmatter[key] = value

    return frontmatter, body


def load_rules(event_type: str) -> list[dict]:
    """Load all enabled rules for the given event type."""
    rules = []

    for base_dir in RULE_LOCATIONS:
        if not base_dir.exists():
            continue

        # Find hookify rule files
        for rule_file in base_dir.glob("hookify.*.local.md"):
            try:
                content = rule_file.read_text(encoding="utf-8")
                frontmatter, message = parse_frontmatter(content)

                # Skip disabled rules
                if not frontmatter.get("enabled", True):
                    continue

                # Check event type match
                rule_event = frontmatter.get("event", "all")
                if rule_event != "all" and rule_event != event_type:
                    continue

                rules.append({
                    "name": frontmatter.get("name", rule_file.stem),
                    "pattern": frontmatter.get("pattern"),
                    "action": frontmatter.get("action", "warn"),
                    "conditions": frontmatter.get("conditions", []),
                    "message": message,
                    "file": str(rule_file),
                })
            except Exception as e:
                print(f"Warning: Skipped malformed rule {rule_file}: {e}", file=sys.stderr)
                continue

    return rules


def evaluate_operator(value: str, operator: str, pattern: str) -> bool:
    """Evaluate a condition operator."""
    if not value:
        return False

    if operator == "regex_match":
        return bool(re.search(pattern, value))
    elif operator == "contains":
        return pattern in value
    elif operator == "not_contains":
        return pattern not in value
    elif operator == "equals":
        return value == pattern
    elif operator == "starts_with":
        return value.startswith(pattern)
    elif operator == "ends_with":
        return value.endswith(pattern)

    return False


def get_field_value(field: str, context: dict) -> str:
    """Get field value from context."""
    return context.get(field, "")


def check_rule(rule: dict, context: dict) -> bool:
    """Check if a rule matches the given context."""
    # Simple pattern matching
    if rule.get("pattern"):
        # Check against all text fields in context
        for key in ["new_text", "content", "command", "user_prompt", "file_path"]:
            value = context.get(key, "")
            if value and re.search(rule["pattern"], value):
                return True
        return False

    # Complex conditions (all must match)
    conditions = rule.get("conditions", [])
    if not conditions:
        return False

    for condition in conditions:
        field = condition.get("field", "")
        operator = condition.get("operator", "regex_match")
        pattern = condition.get("pattern", "")

        value = get_field_value(field, context)
        if not evaluate_operator(value, operator, pattern):
            return False

    return True


def format_message(rule: dict, action: str) -> str:
    """Format the output message."""
    lines = []

    if action == "block":
        lines.append("\n" + "=" * 60)
        lines.append("🛑 HOOKIFY: OPERATION BLOCKED")
        lines.append("=" * 60)
    else:
        lines.append("\n" + "-" * 60)
        lines.append("⚠️  HOOKIFY: WARNING")
        lines.append("-" * 60)

    lines.append(f"\nRule: {rule['name']}")
    lines.append("")

    # Add the rule's message body
    if rule.get("message"):
        lines.append(rule["message"])

    lines.append("")
    if action == "block":
        lines.append("This operation has been BLOCKED.")
        lines.append("Fix the issue and try again.")
    else:
        lines.append("(This is a warning - operation will continue)")

    lines.append("=" * 60 if action == "block" else "-" * 60)
    lines.append("")

    return "\n".join(lines)


def process_file_event(tool_input: dict, tool_name: str) -> tuple[dict, str]:
    """Process file-related events (Write/Edit/MultiEdit)."""
    context = {}
    event_type = "file"

    if tool_name == "Write":
        context["file_path"] = tool_input.get("file_path", "")
        context["content"] = tool_input.get("content", "")
        context["new_text"] = context["content"]
    elif tool_name == "Edit":
        context["file_path"] = tool_input.get("file_path", "")
        context["old_text"] = tool_input.get("old_string", "")
        context["new_text"] = tool_input.get("new_string", "")
    elif tool_name == "MultiEdit":
        context["file_path"] = tool_input.get("file_path", "")
        edits = tool_input.get("edits", [])
        context["new_text"] = "\n".join(e.get("new_string", "") for e in edits)
        context["old_text"] = "\n".join(e.get("old_string", "") for e in edits)

    return context, event_type


def process_bash_event(tool_input: dict) -> tuple[dict, str]:
    """Process Bash command events."""
    context = {
        "command": tool_input.get("command", "")
    }
    return context, "bash"


def main():
    """Main entry point for the hook."""
    try:
        # Read tool input from stdin
        input_data = json.loads(sys.stdin.read())

        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        # Determine event type and build context
        if tool_name in ("Write", "Edit", "MultiEdit"):
            context, event_type = process_file_event(tool_input, tool_name)
        elif tool_name == "Bash":
            context, event_type = process_bash_event(tool_input)
        else:
            # Not a supported event type
            sys.exit(0)

        # Load applicable rules
        rules = load_rules(event_type)

        # Check each rule
        triggered_rules = []
        for rule in rules:
            if check_rule(rule, context):
                triggered_rules.append(rule)

        if not triggered_rules:
            sys.exit(0)

        # Process triggered rules (block takes precedence)
        should_block = any(r["action"] == "block" for r in triggered_rules)

        # Output messages
        for rule in triggered_rules:
            action = rule["action"]
            message = format_message(rule, action)
            print(message, file=sys.stderr)

        # Exit with appropriate code
        if should_block:
            sys.exit(2)
        else:
            sys.exit(0)

    except json.JSONDecodeError as e:
        print(f"Warning: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(0)  # Don't block on parse errors
    except Exception as e:
        print(f"Warning: Unexpected error in hookify-processor: {e}", file=sys.stderr)
        sys.exit(0)  # Don't block on unexpected errors


if __name__ == "__main__":
    main()
