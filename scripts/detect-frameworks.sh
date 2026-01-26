#!/bin/bash
# Purpose: Detect frameworks from package.json
# Input: Project root path (default: current directory)
# Output: Comma-separated framework names or "N/A"
set -euo pipefail

root="${1:-.}"
pkgjson="$root/package.json"

[ ! -f "$pkgjson" ] && echo "N/A" && exit 0

fw_list=()
grep -q '"next"' "$pkgjson" 2>/dev/null && fw_list+=("Next.js")
grep -q '"react"' "$pkgjson" 2>/dev/null && fw_list+=("React")
grep -q '"vue"' "$pkgjson" 2>/dev/null && fw_list+=("Vue")
grep -q '"hono"' "$pkgjson" 2>/dev/null && fw_list+=("Hono")
grep -q '"express"' "$pkgjson" 2>/dev/null && fw_list+=("Express")
grep -q '"fastify"' "$pkgjson" 2>/dev/null && fw_list+=("Fastify")
grep -q '"svelte"' "$pkgjson" 2>/dev/null && fw_list+=("Svelte")
grep -q '"angular"' "$pkgjson" 2>/dev/null && fw_list+=("Angular")

[ ${#fw_list[@]} -gt 0 ] && printf '%s, ' "${fw_list[@]}" | sed 's/, $/\n/' || echo "N/A"
