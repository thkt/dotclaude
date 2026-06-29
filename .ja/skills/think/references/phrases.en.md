# Empty phrases (English)

Detect and fix LLM-style empty phrasing in the SOW / Spec body. Use alongside prose-review.md when the body is in English.

| Pattern            | Signal                                                     | Fix                                            |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| Boilerplate opener | `This SOW/Spec describes/reports/proposes...`              | Start with the problem, not self-description   |
| Empty intensifier  | `comprehensive`, `robust`, `thorough`                      | Drop or replace with specifics (counts, names) |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`      | Enumerate or count                             |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`       | One hedge maximum, or commit                   |
| Filler phrase      | `Looking forward to your thoughts`, `Any feedback welcome` | Delete. State the fact or ask directly         |
