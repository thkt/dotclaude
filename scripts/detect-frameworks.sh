#!/bin/zsh
# Purpose: Detect frameworks from package.json
# Input: Project root path (default: current directory)
# Output: Comma-separated framework names or "N/A"
set -euo pipefail

root="${1:-.}"
pkgjson="$root/package.json"

[ ! -f "$pkgjson" ] && echo "N/A" && exit 0

fw_map=(
  "next:Next.js"
  "react:React"
  "vue:Vue"
  "hono:Hono"
  "express:Express"
  "fastify:Fastify"
  "svelte:Svelte"
  "angular:Angular"
)

has_dep() {
  if command -v jq &>/dev/null; then
    jq -e --arg p "$1" '.dependencies[$p] // .devDependencies[$p]' "$pkgjson" &>/dev/null
  else
    grep -q "\"$1\"[[:space:]]*:" "$pkgjson" 2>/dev/null
  fi
}

fw_list=()
for entry in "${fw_map[@]}"; do
  pkg="${entry%%:*}"
  name="${entry#*:}"
  has_dep "$pkg" && fw_list+=("$name")
done

[ ${#fw_list[@]} -gt 0 ] && printf '%s, ' "${fw_list[@]}" | sed 's/, $/\n/' || echo "N/A"
