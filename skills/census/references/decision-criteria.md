# /census decision criteria

Used by Step 5 tagging / ranking / critic-design challenge. Passed whole to critic-design in Step 5b.

## incomplete-contract examples

A finding is `incomplete-contract` when code carries a comment stating what is true but not what must remain true. The typical case is an SSRF-safe HTTP client field annotated "redirect disabled for SSRF" with no rule saying "future commands handling user URLs MUST use this client". Common with security invariants and design rationale that rely on the reader inferring "and this should stay this way." Such findings are strong ADR candidates regardless of `documented?` value, because the missing forward-looking rule is what an ADR uniquely provides.

## ADR worth heuristic

Existing enforcement mechanisms (lint config, type system, automated tests) are stronger than ADR text for mechanical decisions. Reserve ADR for the following two categories where mechanisms cannot help.

1. Invariants not enforceable by tools (e.g., "field X must not be used with Y" when both are same type)
2. Public API compatibility commitments (e.g., exit code convention, JSON output schema)

Statement-of-fact configs (deny.toml, Cargo.toml `[lints.*]`) are themselves the source of truth; duplicating into an ADR creates drift risk. A 1-2 line policy comment in the config block usually suffices.

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

critic-design challenges each initial promotion candidate with the following.

- Does a future contributor actually benefit from the rule? Who is the reader?
- Does a non-ADR mechanism already cover it (comment + test, statement-of-fact config like deny.toml / Cargo.toml lints, type system, lint)? Then the ADR is redundant.
- Does ADR risk lock-in (over-documenting decisions that should evolve)?
- For monolithic-boundary candidates, would the ADR justify the status quo and reduce pressure to split?
- Bug vs Invariant: is this candidate describing a fix-the-bug case (current code is wrong and should change) or an invariant-to-document case (current code is intentional and should be preserved)? Bugs must be surfaced as bug-fix follow-ups, not ADRs. Documenting wrong behavior as intentional locks in the bug.
