#!/bin/bash
# Test hook to verify Claude receives hook output
# Note: stderr is passed to Claude when exit code is 2

{
  echo "🛡️ BLOCKED by test hook"
  echo ""
  echo "Problem: This is a test block"
  echo "Fix: Please write 'hello world' instead"
  echo ""
  echo "Please fix and retry."
} >&2

exit 2
