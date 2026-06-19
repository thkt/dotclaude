# /census decision criteria

Used by Step 5 tagging / ranking / `critic-design` challenge. Passed whole to `critic-design` in Step 5b.

## incomplete-contract

A finding is `incomplete-contract` when code carries a comment stating what is true but not what must remain true. It relies on the reader inferring "and this should stay this way," common with security invariants and design rationale. Since the missing forward-looking rule can only be supplied by an ADR, treat it as a strong ADR candidate regardless of `documented?` value.

For example, an SSRF-safe HTTP client field is annotated "redirect disabled for SSRF" but carries no rule saying "future commands handling user URLs MUST use this client".

## ADR worth heuristic

Existing enforcement mechanisms (lint config, type system, automated tests) are stronger than ADR text for mechanical decisions. Reserve ADR for the following two categories where mechanisms cannot help.

1. Invariants not enforceable by tools (e.g., "field X must not be used with Y" when both are same type)
2. Public API compatibility commitments (e.g., exit code convention, JSON output schema)

Statement-of-fact configs (`deny.toml` / `Cargo.toml`) are themselves the source of truth; duplicating into an ADR creates drift risk. A 1-2 line policy comment in the config block usually suffices.

## impact + reversibility criteria

| Impact | Criteria                                                              |
| ------ | --------------------------------------------------------------------- |
| H      | Crosses module boundary, affects public API, or governs 2+ subsystems |
| M      | Affects single module's internal contract                             |
| L      | Local style or naming choice                                          |

| Reversibility | Criteria                                                         |
| ------------- | ---------------------------------------------------------------- |
| high          | Decision can be reversed by editing one location                 |
| medium        | Reversal requires coordinated changes across 2-5 files           |
| low           | Reversal requires migration, deprecation cycle, or schema change |

## Devil's Advocate challenge angles

`critic-design` challenges each initial promotion candidate with the following.

- Does a future contributor actually benefit from the rule? Who is the reader?
- Does a non-ADR mechanism already cover it (comment + test, statement-of-fact config like `deny.toml` / `Cargo.toml` lints, type system, lint)? Then the ADR is redundant.
- Does ADR risk lock-in (over-documenting decisions that should evolve)?
- For monolithic-boundary candidates, would the ADR justify the status quo and reduce pressure to split?
- Bug vs Invariant: is this candidate describing a fix-the-bug case (current code is wrong and should change) or an invariant-to-document case (current code is intentional and should be preserved)? Bugs must be surfaced as bug-fix follow-ups, not ADRs. Documenting wrong behavior as intentional locks in the bug.

## Verdict

`critic-design` challenges each candidate with the angles above and returns one of the verdicts below. The final candidate list = `keep` candidates + `downgrade` candidates (with target ADR), minus `drop`.

| Verdict     | Meaning                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `keep`      | ADR worth, file as standalone or merge with related candidates                                               |
| `downgrade` | Not standalone ADR; absorb into a related ADR section or strengthen comments                                 |
| `drop`      | Not ADR-worthy; config/comment/test already covers it, cost > value, or a bug (route to a bug-fix follow-up) |
