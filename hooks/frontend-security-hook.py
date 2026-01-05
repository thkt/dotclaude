#!/usr/bin/env python3
"""
Frontend Security Hook for Claude Code

Detects security vulnerabilities in frontend code during Edit/Write/MultiEdit operations.
Based on Anthropic's security-guidance plugin, filtered for frontend patterns.

Exit codes:
- 0: No issues found
- 2: Security issue detected (blocks the operation)
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Frontend-specific security patterns
FRONTEND_PATTERNS = {
    "react-xss": {
        "pattern": r"dangerouslySetInnerHTML",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "XSS Risk: dangerouslySetInnerHTML detected",
        "recommendation": "Use DOMPurify to sanitize HTML or avoid innerHTML entirely",
        "severity": "high"
    },
    "dom-write": {
        "pattern": r"document\.write\s*\(",
        "file_pattern": r"\.(jsx?|tsx?|html?)$",
        "message": "XSS Risk: document.write() detected",
        "recommendation": "Use DOM methods like createElement/appendChild instead",
        "severity": "high"
    },
    "innerHTML-assignment": {
        "pattern": r"\.innerHTML\s*=",
        "file_pattern": r"\.(jsx?|tsx?|html?)$",
        "message": "XSS Risk: Direct innerHTML assignment detected",
        "recommendation": "Use textContent for text, or sanitize with DOMPurify",
        "severity": "high"
    },
    "eval-function": {
        "pattern": r"\beval\s*\(",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "Code Injection Risk: eval() detected",
        "recommendation": "Use JSON.parse() for JSON, or Function constructor with caution",
        "severity": "critical"
    },
    "new-function": {
        "pattern": r"new\s+Function\s*\(",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "Code Injection Risk: new Function() detected",
        "recommendation": "Avoid dynamic code execution. For template literals use tagged templates. For JSON use JSON.parse(). For math expressions use a safe evaluator library",
        "severity": "critical"
    },
    "outerHTML-assignment": {
        "pattern": r"\.outerHTML\s*=",
        "file_pattern": r"\.(jsx?|tsx?|html?)$",
        "message": "XSS Risk: Direct outerHTML assignment detected",
        "recommendation": "Use DOM methods for element manipulation",
        "severity": "medium"
    },
    "setTimeout-string": {
        "pattern": r"setTimeout\s*\(\s*['\"`]",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "Code Injection Risk: setTimeout with string argument detected",
        "recommendation": "Use function reference instead of string: setTimeout(() => { ... }, delay)",
        "severity": "high"
    },
    "setInterval-string": {
        "pattern": r"setInterval\s*\(\s*['\"`]",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "Code Injection Risk: setInterval with string argument detected",
        "recommendation": "Use function reference instead of string: setInterval(() => { ... }, delay)",
        "severity": "high"
    },
    "postMessage-unsafe": {
        "pattern": r"\.postMessage\s*\([^,]+,\s*['\"`]\*['\"`]\s*\)",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "Security Risk: postMessage with '*' targetOrigin detected",
        "recommendation": "Specify exact origin instead of '*' to prevent data leakage to malicious sites",
        "severity": "high"
    },
    "localStorage-sensitive": {
        "pattern": r"localStorage\.(setItem|getItem)\s*\(\s*['\"`](token|password|secret|key|auth|credential)",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "Security Risk: Sensitive data stored in localStorage",
        "recommendation": "Use httpOnly cookies for tokens/credentials, or encrypt sensitive data before storage",
        "severity": "medium"
    },
    "sessionStorage-sensitive": {
        "pattern": r"sessionStorage\.(setItem|getItem)\s*\(\s*['\"`](token|password|secret|key|auth|credential)",
        "file_pattern": r"\.(jsx?|tsx?)$",
        "message": "Security Risk: Sensitive data stored in sessionStorage",
        "recommendation": "Use httpOnly cookies for tokens/credentials, or encrypt sensitive data before storage",
        "severity": "medium"
    }
}

# Session state file for deduplication
STATE_DIR = Path.home() / ".claude" / "logs" / "security-hooks"
LOG_FILE = Path.home() / ".claude" / "logs" / "security-warnings.log"


def get_session_id() -> str:
    """Get current session ID from environment."""
    return os.environ.get("CLAUDE_SESSION_ID", "unknown")


def get_state_file() -> Path:
    """Get session-specific state file path."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    return STATE_DIR / f"warnings-{get_session_id()}.json"


def load_warnings() -> set:
    """Load previously shown warnings for this session."""
    state_file = get_state_file()
    if state_file.exists():
        try:
            data = json.loads(state_file.read_text())
            return set(data.get("warnings", []))
        except (json.JSONDecodeError, KeyError):
            return set()
    return set()


def save_warning(warning_key: str) -> None:
    """Save a warning to avoid showing it again."""
    try:
        state_file = get_state_file()
        warnings = load_warnings()
        warnings.add(warning_key)
        state_file.write_text(json.dumps({"warnings": list(warnings)}))
    except OSError:
        pass  # Ignore write errors - duplicate warnings are acceptable


def log_check(message: str) -> None:
    """Log security check activity."""
    timestamp = datetime.now().isoformat()
    with LOG_FILE.open("a") as f:
        f.write(f"[{timestamp}] {message}\n")


def check_content(content: str, file_path: str) -> list:
    """Check content for security issues."""
    issues = []
    existing_warnings = load_warnings()  # Cache outside loop

    for rule_name, rule in FRONTEND_PATTERNS.items():
        # Check if file matches the pattern
        if not re.search(rule["file_pattern"], file_path, re.IGNORECASE):
            continue

        # Check content for the pattern
        if re.search(rule["pattern"], content):
            warning_key = f"{file_path}:{rule_name}"

            # Skip if already warned in this session
            if warning_key in existing_warnings:
                continue

            issues.append({
                "rule": rule_name,
                "message": rule["message"],
                "recommendation": rule["recommendation"],
                "severity": rule["severity"],
                "file": file_path
            })
            save_warning(warning_key)

    return issues


def format_warning(issues: list) -> str:
    """Format issues into a readable warning message."""
    severity_icons = {
        "critical": "🚨",
        "high": "⚠️",
        "medium": "⚡"
    }

    lines = ["\n" + "=" * 60]
    lines.append("🛡️  FRONTEND SECURITY CHECK")
    lines.append("=" * 60)

    for issue in issues:
        icon = severity_icons.get(issue["severity"], "⚠️")
        lines.append(f"\n{icon} [{issue['severity'].upper()}] {issue['message']}")
        lines.append(f"   File: {issue['file']}")
        lines.append(f"   Recommendation: {issue['recommendation']}")

    lines.append("\n" + "-" * 60)
    lines.append("This operation has been BLOCKED for security review.")
    lines.append("Fix the issues above and try again.")
    lines.append("=" * 60 + "\n")

    return "\n".join(lines)


def main():
    """Main entry point for the hook."""
    try:
        # Read tool input from stdin
        input_data = json.loads(sys.stdin.read())

        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        # Get file path and content based on tool type
        file_path = ""
        content = ""

        if tool_name == "Write":
            file_path = tool_input.get("file_path", "")
            content = tool_input.get("content", "")
        elif tool_name == "Edit":
            file_path = tool_input.get("file_path", "")
            content = tool_input.get("new_string", "")
        elif tool_name == "MultiEdit":
            # Check all edits in MultiEdit
            file_path = tool_input.get("file_path", "")
            edits = tool_input.get("edits", [])
            content = "\n".join(edit.get("new_string", "") for edit in edits)
        else:
            # Not a file operation we care about
            sys.exit(0)

        if not file_path or not content:
            sys.exit(0)

        log_check(f"Checking {tool_name} on {file_path}")

        # Check for security issues
        issues = check_content(content, file_path)

        if issues:
            log_check(f"Found {len(issues)} issue(s) in {file_path}")
            warning = format_warning(issues)
            print(warning, file=sys.stderr)
            sys.exit(2)  # Block the operation

        log_check(f"No issues found in {file_path}")
        sys.exit(0)

    except json.JSONDecodeError:
        log_check("Error: Invalid JSON input")
        sys.exit(0)  # Don't block on parse errors
    except Exception as e:
        log_check(f"Error: {str(e)}")
        sys.exit(0)  # Don't block on unexpected errors


if __name__ == "__main__":
    main()
