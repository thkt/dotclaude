# /census decision criteria

Used by Phase 5 tagging / ranking / `critic-design` challenge. Passed whole to `critic-design` in Phase 5b.

## incomplete-contract

A finding is `incomplete-contract` when code carries a comment stating what is true but not what must remain true. It relies on the reader inferring "and this should stay this way," common with security invariants and design rationale. Since the missing forward-looking rule can only be supplied by a DR, treat it as a strong DR candidate regardless of `documented?` value.

For example, an SSRF-safe HTTP client field is annotated "redirect disabled for SSRF" but carries no rule saying "future commands handling user URLs MUST use this client".

## DR-worth rule of thumb

Existing enforcement mechanisms such as lint config, the type system, and automated tests are stronger than DR text for mechanical decisions. Reserve DR for the following two categories where mechanisms cannot help.

1. Invariants not enforceable by tools (e.g., "field X must not be used with Y" when both are same type)
2. Public API compatibility commitments (e.g., exit code convention, JSON output schema)

Statement-of-fact configs (`deny.toml` / `Cargo.toml`) are themselves the source of truth; duplicating into a DR creates drift risk. A 1-2 line policy comment in the config block usually suffices.

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
- Does a non-DR mechanism already cover it: comment + test, statement-of-fact config, type system, lint? Then the DR is redundant.
- Does the DR risk lock-in? Over-documenting a decision that should evolve locks it in.
- For monolithic-boundary candidates, would the DR justify the status quo and reduce pressure to split?
- Bug or invariant. If the current code is wrong and should change, surface it as a bug-fix follow-up, not a DR. If the current code is intentional and should be preserved, consider the DR. Never document wrong behavior as intentional.

## Verdict

The final candidate list consists of `keep` plus `downgrade` with its target DR named; `drop` is excluded.

| Verdict     | Meaning                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `keep`      | DR worth, file as standalone or merge with related candidates                                                        |
| `downgrade` | Not standalone DR; absorb into a related DR section or strengthen comments                                           |
| `drop`      | Not DR-worthy; config / comment / test already covers it, cost exceeds value, or a bug routed to a bug-fix follow-up |
