---
paths:
  - "**/*.sh"
  - "**/*.zsh"
  - ".claude/hooks/**"
---

# Shell Script Conventions

## Shell

| Rule    | Value                                                |
| ------- | ---------------------------------------------------- |
| Shebang | `#!/bin/zsh` (macOS default)                         |
| Strict  | Enforcement: `set -euo pipefail`                     |
| Relaxed | Informational: `set +e`                              |
| SIGPIPE | `cmd \| head` with pipefail → add `\|\| true` at end |

## zsh Pitfalls

| Pitfall              | Bad                                           | Good                                                   |
| -------------------- | --------------------------------------------- | ------------------------------------------------------ |
| JSON in echo         | `echo "$JSON" \| jq`                          | `printf '%s' "$JSON" \| jq`                            |
| Pattern join         | `COMBINED=$(IFS='\|'; echo "${PATTERNS[*]}")` | `COMBINED="${(j:\|:)PATTERNS}"`                        |
| Regex match variable | `$BASH_REMATCH[0]`                            | `$MATCH` (with `setopt REMATCH_PCRE`)                  |
| Word boundary        | `\b` in POSIX ERE (unsupported)               | `setopt REMATCH_PCRE` then `\b`                        |
| Path normalization   | `realpath` (fails on nonexistent)             | `${path:a}` (zsh modifier)                             |
| realpath -m          | `realpath -m` (unavailable on macOS)          | `python3 -c "import os; print(os.path.realpath(...))"` |
| echo escapes         | `echo "$var"` (interprets `\n`, `\t`, `\b`)   | `printf '%s' "$var"` (literal)                         |
| Associative arrays   | bash `declare -A`                             | zsh `typeset -A`                                       |

## Error Policy

| Hook Type     | Policy      | Rationale                     |
| ------------- | ----------- | ----------------------------- |
| Enforcement   | fail-closed | Security/gate hooks must halt |
| Informational | fail-open   | Status/format hooks can skip  |
