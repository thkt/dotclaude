# Prose Review

Write for a teammate who shares context and can open the linked docs, not a zero-context reader. The issue carries the delta; links carry the background. Do not write a line whose removal would not mislead the reader.

## Structure

Check the structure the issue body must satisfy.

| Check             | Question                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Problem stated    | Is the problem or request in 1-3 lines at the top?                                                                      |
| Reproducible      | Bug: are reproduction steps concrete? Feature: is the use case concrete?                                                |
| Expected outcome  | Is the expected behavior explicit, not left for the reader to infer?                                                    |
| Reader action     | Is the ask specific ("review spec", "investigate cause", "decide by X")?                                                |
| Scope             | Is the issue focused on one problem, not a dump of related concerns?                                                    |
| Length            | Does the body fit in ~40 lines? If it overflows, cut it or split into another issue / link                              |
| Delta focus       | Does it skip what the code shows (function names, line-level diffs, obvious steps) and stay on why and done conditions? |
| Outcome alignment | Does this advance the outcome state? If it steps into Non-goals, flag explicitly in body                                |

## Redundancy and duplication patterns

Detect and fix redundancy and duplication that surface in form and structure. Language-independent. Lexical empty phrasing is out of scope here and checked in a separate step of the invocation flow.

| Pattern            | Signal                                                                                                           | Fix                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Doc transcription  | Pasting or restating linked design-doc or investigation / verification / CI-log content in the issue             | Link + one-line takeaway (one line for a number); write only the delta                      |
| Repeated rationale | Same design reason explained twice in one issue                                                                  | State once, where the decision lands                                                        |
| Option enumeration | Filling the body with option A / option B / option C or comparison tables                                        | Keep only what is decided (or the one point to decide); move comparisons to a design thread |
| Redundant form     | Same structure or info expressed in multiple forms (a dependency drawn as diagram + order table + tracking list) | Keep the single clearest form; drop the rest                                                |
| Bold overuse       | Bold scattered on every other line                                                                               | Headings carry structure; bold only warnings                                                |
| Over-specified AC  | AC spelling out authoring details (story names, addon config)                                                    | Keep the criterion, drop authoring details. UI component issues keep Storybook/a11y as DoD  |
| Compulsive section | Optional section filled with nothing to say                                                                      | Omit empty optional sections                                                                |
