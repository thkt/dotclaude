# Confidence Marking

Mark which parts of the body are fixed vs tentative, so the implementer can tell a requirement to honor from an undecided judgment or unverified fact.

- A first pass, not a verification pass; settling facts is delegated to /challenge
- Mark sparingly, only where it changes implementer action. Marking every line buries the marks that matter and defeats the distinction
- Tentative marks stay inline at the item they qualify. The Premises section stays reserved for issue-level premises that do not attach to a specific line (design refs, global assumptions)
- The marker word follows the language setting in settings.json (`仮` under Japanese)

| Origin                                                                                            | State     | Notation           | Action phrase                                         |
| ------------------------------------------------------------------------------------------------- | --------- | ------------------ | ----------------------------------------------------- |
| User decided it, or it is the ask (What & Why, Acceptance Criteria, explicit Scope / Constraints) | fixed     | unmarked           | -                                                     |
| AI-inferred HOW (placement, approach, format), or a decision the user left open                   | tentative | `(tentative: ...)` | "decide at pickup" / "change if a better fit appears" |
| Fact not yet verified (a claim left unverified in the body)                                       | tentative | `(tentative: ...)` | "recheck at pickup"                                   |
