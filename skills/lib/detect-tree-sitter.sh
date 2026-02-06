#!/bin/bash
# Detect tree-sitter-analyzer availability
# Sets: USE_TSA (true/false)

if command -v tree-sitter-analyzer &> /dev/null; then
    USE_TSA=true
else
    USE_TSA=false
    echo "⚠️  tree-sitter-analyzer not found. Running in grep fallback mode."
    echo ""
fi
