# Prose Review

Write for a teammate who shares context and can open the linked docs, not a zero-context reader. The issue carries the delta; links carry the background.

## Structure (Issue-specific)

| Check             | Question                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Problem stated    | Is the problem or request in 1-3 lines at the top?                                       |
| Reproducible      | Bug: are reproduction steps concrete? Feature: is the use case concrete?                 |
| Expected outcome  | Is the expected behavior explicit, not left for the reader to infer?                     |
| Reader action     | Is the ask specific ("review spec", "investigate cause", "decide by X")?                 |
| Scope             | Is the issue focused on one problem, not a dump of related concerns?                     |
| Outcome alignment | Does this advance the outcome state? If it steps into Non-goals, flag explicitly in body |

## Anti-AI-pattern

| Pattern            | Signal                                                                                                           | Fix                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Boilerplate opener | `This issue describes/reports/proposes...`                                                                       | Start with the problem, not self-description                                               |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                                                                | Drop or replace with specifics (counts, names)                                             |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                                                              | Use `use`, `do`, `let`                                                                     |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`                                                            | Enumerate or count                                                                         |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                                                             | One hedge maximum, or commit                                                               |
| Filler phrase      | `It should be noted that...`, `Looking forward to your thoughts`, `Any feedback welcome`                         | Delete. State the fact or ask directly                                                     |
| Doc transcription  | Restating linked design-doc content in the issue                                                                 | Link + one-line takeaway; write only the delta                                             |
| Repeated rationale | Same design reason explained twice in one issue                                                                  | State once, where the decision lands                                                       |
| Redundant form     | Same structure or info expressed in multiple forms (a dependency drawn as diagram + order table + tracking list) | Keep the single clearest form; drop the rest                                               |
| Bold overuse       | Bold scattered on every other line                                                                               | Headings carry structure; bold only warnings                                               |
| Over-specified AC  | AC spelling out authoring details (story names, addon config)                                                    | Keep the criterion, drop authoring details. UI component issues keep Storybook/a11y as DoD |
| Compulsive section | Optional section filled with nothing to say                                                                      | Omit empty optional sections                                                               |
