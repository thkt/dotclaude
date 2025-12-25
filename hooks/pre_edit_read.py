#!/usr/bin/env python3
"""
PreToolUse hook: Auto-read file before Edit tool execution.

This hook automatically reads file content before Edit tool runs,
eliminating the "file not read" error and saving a round-trip.

Reference: https://zenn.dev/st_tech/articles/897e52be12232f
"""

import json
import sys
import os
from pathlib import Path

# Configuration
MAX_FILE_SIZE = 50 * 1024  # 50KB limit
DEBUG = False  # Set to True for debugging


def debug_log(message: str) -> None:
    """Write debug message to log file."""
    if not DEBUG:
        return
    log_path = Path.home() / ".claude" / "hooks" / "pre_edit_read.log"
    with open(log_path, "a") as f:
        f.write(f"{message}\n")


def main() -> None:
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        debug_log(f"Input: {input_data[:200]}...")

        # Extract file_path from tool_input
        tool_input = data.get("tool_input", {})
        file_path = tool_input.get("file_path")

        if not file_path:
            debug_log("No file_path found")
            sys.exit(0)

        # Expand ~ to home directory
        file_path = os.path.expanduser(file_path)
        path = Path(file_path)

        # Check if file exists
        if not path.exists():
            debug_log(f"File does not exist: {file_path}")
            sys.exit(0)

        # Check file size
        file_size = path.stat().st_size
        if file_size > MAX_FILE_SIZE:
            debug_log(f"File too large: {file_size} bytes")
            sys.exit(0)

        # Read and output file content
        content = path.read_text(encoding="utf-8")

        # Output to stdout - this registers the content in Edit tool's cache
        print(content)

        debug_log(f"Successfully read: {file_path} ({file_size} bytes)")

    except json.JSONDecodeError as e:
        debug_log(f"JSON parse error: {e}")
    except Exception as e:
        debug_log(f"Error: {e}")

    # Always exit 0 to allow Edit to proceed
    sys.exit(0)


if __name__ == "__main__":
    main()
