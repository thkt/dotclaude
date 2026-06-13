<!-- /census decision criteria. Pass to critic-design in Step 6.2. -->

## incomplete-contract examples

A finding is `incomplete-contract` when code carries a comment stating what is true but not what must remain true. Example: an SSRF-safe HTTP client field annotated "redirect disabled for SSRF" with no rule saying "future commands handling user URLs MUST use this client." Common with security invariants and design rationale that rely on the reader inferring "and this should stay this way." Such findings are strong ADR candidates regardless of `documented?` value, because the missing forward-looking rule is what an ADR uniquely provides.

## ADR worth heuristic

Empirically derived from scout試運転 2026-05-13: existing enforcement mechanisms (lint config, type system, automated tests) are stronger than ADR text for mechanical decisions. Reserve ADR for two categories where mechanisms cannot help:

1. Invariants not enforceable by tools (e.g., "field X must not be used with Y" when both are same type)
2. Public API compatibility commitments (e.g., exit code convention, JSON output schema)

Statement-of-fact configs (deny.toml, Cargo.toml `[lints.*]`) are themselves the source of truth; duplicating into an ADR creates drift risk. A 1-2 line policy comment in the config block usually suffices.
