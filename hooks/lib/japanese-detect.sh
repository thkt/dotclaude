#!/bin/zsh
# Shared Japanese detection. Reads from stdin.
# Usage: has_japanese < file.md  OR  echo "text" | has_japanese

JAPANESE_CHAR_THRESHOLD=50

# Optional $1 overrides the threshold (short inputs like commit messages need a lower bar)
has_japanese() {
  local threshold=${1:-$JAPANESE_CHAR_THRESHOLD}
  [[ $(LC_ALL=en_US.UTF-8 grep -o '[ぁ-んァ-ヶー一-龥]' | wc -l) -ge $threshold ]]
}
