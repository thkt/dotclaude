# /census detection targets

Step 2 scans file patterns, Step 4 scans decision verbs.

| Filename pattern                                                     | Likely content                       |
| -------------------------------------------------------------------- | ------------------------------------ |
| `README.md`                                                          | Design intent, naming, prohibitions  |
| `CONTRIBUTING.md`                                                    | Code style decisions, workflow rules |
| `SECURITY.md`                                                        | Threat boundaries, security policies |
| `THREAT_MODEL.md`                                                    | Trust boundaries, mitigations        |
| `ARCHITECTURE.md`                                                    | Module decomposition, layer policy   |
| `DESIGN.md` / `*.design.md`                                          | Component rationale                  |
| `CLAUDE.md` / `AGENTS.md`                                            | AI-agent operating decisions         |
| `Makefile` / `justfile`                                              | Build flow decisions                 |
| Linter config (`Cargo.toml` `[lints.*]`, `.eslintrc`, `oxlint.json`) | Rule selection rationale             |

## Decision verbs (Step 4)

Within detected documents, nominate sentences containing these verbs.

- English: "decide", "choose", "adopt", "reject", "deprecate", "must not", "never", "always"
- Japanese: "決定", "採用", "禁止", "方針", "選定", "排除", "従う", "規約"
