# External Tool Constraints

Rule: Check external tool constraints before implementing tests or code.

## Top 10 Pitfalls

| #   | Tool/Context     | Pitfall                                               | Verification                                |
| --- | ---------------- | ----------------------------------------------------- | ------------------------------------------- |
| 1   | Git branch/tag   | `[` `]` `~` `^` `:` `\` `..` space prohibited         | `git check-ref-format --branch "name"`      |
| 2   | Cargo crate name | `_` converted to `-`, alphanumeric and `-` only       | `cargo search crate-name` or check Docs     |
| 3   | npm package name | max 214 chars, lowercase enforced, `@scope/` format   | `npm info package-name`                     |
| 4   | Docker image/tag | lowercase only, `/` is namespace, `:` is tag          | Check official documentation                |
| 5   | Shell arrays     | No arrays in POSIX, bash/zsh syntax differs           | `echo $0` to check shell                    |
| 6   | Regex engine     | PCRE vs ERE vs BRE vs JavaScript differences          | Check `--help` for engine used              |
| 7   | macOS filename   | `:` prohibited, case-insensitive by default           | `touch "test:file"` to verify error         |
| 8   | semver version   | `MAJOR.MINOR.PATCH` required, leading `v` is separate | `npx semver "version"` to validate          |
| 9   | Env var name     | Alphanumeric and `_` only, no leading digit           | `export` to check existing, POSIX-compliant |
| 10  | JSON key name    | Double quotes required, trailing comma prohibited     | `jq . file.json` to check parse error       |

## When to Check

| Phase                 | Action                                              |
| --------------------- | --------------------------------------------------- |
| Before test design    | WebSearch external tool constraints for test target |
| Before implementation | Verify naming rules and format constraints          |
| On error              | Suspect constraint violation first                  |

## Verification Principles

| Rule                    | Description                              |
| ----------------------- | ---------------------------------------- |
| Official docs first     | Prefer official docs over Stack Overflow |
| Verify on actual system | Use `--dry-run` or verification commands |
| Version awareness       | Behavior may vary by tool version        |

## Recovery Steps

1. Identify constraint violation from error message
2. Verify exact constraints in official documentation
3. Exclude or fix invalid test cases
4. Check for similar constraint violations elsewhere
