# Tidyings

| Scope | Description                                          |
| ----- | ---------------------------------------------------- |
| When  | After main task, before commit, only in edited files |
| Rule  | No behavior changes                                  |

## Allowed

| Category   | Actions                                     |
| ---------- | ------------------------------------------- |
| Whitespace | Trailing spaces, EOF, indentation           |
| Imports    | Remove unused, alphabetize, group           |
| Variables  | Remove unused, inline single-use, let→const |
| Comments   | Remove resolved TODOs, dead code            |
| Types (TS) | Remove inferable, any→specific              |
| Formatting | Consistent semicolons/quotes/commas         |
| Naming     | Fix typos, case inconsistencies             |

## Never

Logic, structure, features, performance, API changes, test fixes

## Report

`🧹 Tidyings: Whitespace ✓ Imports ✓ Unused ✓`
