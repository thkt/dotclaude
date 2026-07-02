# Prose Review

Review the generated SOW / Spec body and fix redundancy that shows up in form and structure. Structural validity is out of scope here. Lexical empty phrases are also out of scope here and are checked in a separate step of the flow.

| Pattern                   | Signal                                                                                              | Fix                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Doc transcription         | Pasting or restating linked design docs or research / verification / CI log content in the body     | Link plus a one-line summary (numbers in one line). Write only the delta                     |
| Repeated rationale        | Explaining the same design reason twice in one document                                             | State it once, where the decision lands                                                      |
| Approach enumeration      | Filling the body with rejected approach A / B / C or comparison tables                              | Keep only the chosen approach; move comparisons to the ADR / design thread                   |
| Redundant expression form | Expressing the same structure or information in multiple forms (diagram / table / list)             | Keep the single most readable form and drop the rest                                         |
| Bold overuse              | Bold scattered every few lines                                                                      | Leave structure to headings; use bold only for warnings                                      |
| Over-specified AC         | Listing implementation details (function names, file layout, library config) in acceptance criteria | Keep the observable criterion; push implementation detail to the Spec / implementation phase |
| Lazy section              | Filling an optional section (Boundaries, Risks, etc.) with nothing to say                           | Omit empty optional sections                                                                 |
