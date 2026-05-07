# Common Pitfalls

Edge-case constraints from external tools and languages. Before implementation, verify naming and format rules for the target. On error, suspect a constraint violation first and scan for similar cases.

Also covers backend runtime hazards (N+1, missing pagination, optimistic-lock skew) where missing safeguards regularly cause production incidents.

| #   | Tool/Context      | Pitfall                                                                                                                              | Verification                                                |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 1   | Git branch/tag    | `[` `]` `~` `^` `:` `\` `..` space prohibited                                                                                        | `git check-ref-format --branch "name"`                      |
| 2   | npm package name  | max 214 chars, lowercase enforced, `@scope/` format                                                                                  | `npm info package-name`                                     |
| 3   | Docker image/tag  | lowercase only, `/` is namespace, `:` is tag                                                                                         | Check official documentation                                |
| 4   | Regex engine      | PCRE vs ERE vs BRE vs JavaScript differences                                                                                         | Check `--help` for engine used                              |
| 5   | macOS filename    | `:` prohibited, case-insensitive by default                                                                                          | `touch "test:file"` to verify error                         |
| 6   | semver version    | `MAJOR.MINOR.PATCH` required, leading `v` is separate                                                                                | `npx semver "version"` to validate                          |
| 7   | Env var name      | Alphanumeric and `_` only, no leading digit                                                                                          | `export` to check existing, POSIX-compliant                 |
| 8   | JSON key name     | Double quotes required, trailing comma prohibited                                                                                    | `jq . file.json` to check parse error                       |
| 9   | DB query in loop  | N+1 pattern. Batch fetch + `Map` group instead. Drop unused `include`                                                                | `EXPLAIN ANALYZE` and query log for repeat patterns         |
| 10  | `await` chain     | Independent `await`s run serially. Use `Promise.all()`; `Promise.allSettled()` for partial-failure tolerance                         | Grep consecutive `await`, check profiler timeline           |
| 11  | List endpoint     | Missing pagination. Require `limit`/`offset` plus upper-bound validation (default 100)                                               | Inspect handler and OpenAPI; reject unbounded list returns  |
| 12  | Concurrent update | No optimistic lock. Add `version` column, include in `WHERE`, return 409 on mismatch. Check `version === undefined` (not `!version`) | Inspect schema and `UPDATE ... WHERE` clause                |
