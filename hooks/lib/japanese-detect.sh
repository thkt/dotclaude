#!/usr/bin/env bash
# Shared Japanese detection. Reads from stdin.
# Usage: has_japanese < file.md  OR  echo "text" | has_japanese

JAPANESE_CHAR_THRESHOLD=50

has_japanese() {
  [[ $(LC_ALL=en_US.UTF-8 grep -o '[ぁ-んァ-ヶー一-龥]' | wc -l) -ge $JAPANESE_CHAR_THRESHOLD ]]
}
