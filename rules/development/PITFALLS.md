# Common Pitfalls

Edge-case constraints from external tools and languages. Before implementation, verify naming and format rules for the target. On error, suspect a constraint violation first and scan for similar cases.

| #   | Tool/Context     | Pitfall                                               | Verification                                |
| --- | ---------------- | ----------------------------------------------------- | ------------------------------------------- |
| 1   | Git branch/tag   | `[` `]` `~` `^` `:` `\` `..` space prohibited         | `git check-ref-format --branch "name"`      |
| 2   | npm package name | max 214 chars, lowercase enforced, `@scope/` format   | `npm info package-name`                     |
| 3   | Docker image/tag | lowercase only, `/` is namespace, `:` is tag          | Check official documentation                |
| 4   | Regex engine     | PCRE vs ERE vs BRE vs JavaScript differences          | Check `--help` for engine used              |
| 5   | macOS filename   | `:` prohibited, case-insensitive by default           | `touch "test:file"` to verify error         |
| 6   | semver version   | `MAJOR.MINOR.PATCH` required, leading `v` is separate | `npx semver "version"` to validate          |
| 7   | Env var name     | Alphanumeric and `_` only, no leading digit           | `export` to check existing, POSIX-compliant |
| 8   | JSON key name    | Double quotes required, trailing comma prohibited     | `jq . file.json` to check parse error       |
