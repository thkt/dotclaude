# Premise Check

Sifts the claims already drafted into the body. Not a discovery phase. No agent spawns inside this check, no cross-codebase audit, no digging beyond the drafted claims themselves. A factual claim resolves into an assertion by default; downgrade to tentative only when it cannot.

| Claim type                           | Action                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Current-code claim                   | Verify with 2-3 targeted Read / ugrep checks; annotate the basis in body ("grep-confirmed")                               |
| Claim still ambiguous after checking | Downgrade to tentative; never assert it as fact                                                                           |
| Claim contradicted by the source     | Rewrite the body to match the source. If the mismatch itself matters, state it under Premises with the verification ask   |
| External design ref                  | Always unverified; the skill cannot judge whether the source is current, so add a link + "confirm latest before starting" |
| Target file list                     | Annotate "candidates as of writing; recheck on pickup"                                                                    |
| Code example in body                 | Annotate as a reference, not the implementation ("reference shape; final form decided at pickup")                         |
