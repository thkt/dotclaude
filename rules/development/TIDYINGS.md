# Tidyings

| Scope | Description                                          |
| ----- | ---------------------------------------------------- |
| When  | Only in edited files, after main task, before commit |
| Rule  | No behavior changes                                  |

## Allowed

| Category   | Actions                                              |
| ---------- | ---------------------------------------------------- |
| Whitespace | Trailing spaces, EOF, indentation                    |
| Imports    | Remove unused, alphabetize, group                    |
| Variables  | Remove unused, inline single-use, let → const        |
| Comments   | Remove resolved TODOs, remove dead code              |
| Types (TS) | Remove inferable, any → specific                     |
| Formatting | Consistent semicolons / quotes / commas              |
| Naming     | Fix typos, case inconsistencies                      |
| Temp files | Remove temp files created for iteration in this task |

## Not allowed

Logic, structure, features, performance, API changes, test fixes.
