---
paths:
  - "**/*.sh"
  - "**/*.zsh"
---

# Shell

## Shebang

| Condition                             | Choice                                |
| ------------------------------------- | ------------------------------------- |
| Default (macOS)                       | `#!/bin/zsh`                          |
| `BASH_REMATCH` or `declare -A` needed | `#!/bin/bash`                         |
| Always avoid                          | `#!/bin/sh` (POSIX `sh` lacks arrays) |

## Execution

| Mode    | Setting                                              |
| ------- | ---------------------------------------------------- |
| Strict  | `set -euo pipefail` (enforcement)                    |
| Relaxed | `set +e` (informational)                             |
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
