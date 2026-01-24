#!/bin/bash
# Test hook to verify Claude receives hook output

echo "🛡️ BLOCKED by test hook"
echo ""
echo "Problem: This is a test block"
echo "Fix: Please write 'hello world' instead"
echo ""
echo "Please fix and retry."

exit 2
