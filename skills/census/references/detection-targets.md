# /census detection targets

Step 2 scans file patterns. Step 3 (commit messages) and Step 4 (document prose) scan decision verbs.

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

## Decision verbs (Step 3 / Step 4)

Within detected documents, or within commit messages, nominate sentences containing these verbs.

| Type   | English                     | Japanese             |
| ------ | --------------------------- | -------------------- |
| Select | `decide` `choose` `adopt`   | `決定` `採用` `選定` |
| Reject | `reject` `deprecate`        | `禁止` `排除`        |
| Oblige | `must not` `never` `always` | `方針` `従う` `規約` |
