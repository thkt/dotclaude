<!-- /audit-adr-gaps Step 2 detection targets. Scan top-level and docs/ for these. -->

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
