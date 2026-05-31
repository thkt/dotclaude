# Tidyings

| Scope | Description                                          |
| ----- | ---------------------------------------------------- |
| When  | After main task, before commit, only in edited files |
| Rule  | No behavior changes                                  |

## Allowed

| Category   | Actions                                                               |
| ---------- | --------------------------------------------------------------------- |
| Whitespace | Trailing spaces, EOF, indentation                                     |
| Imports    | Remove unused (introduced in this task), alphabetize, group           |
| Variables  | Remove unused (introduced in this task), inline single-use, let→const |
| Comments   | Remove resolved TODOs, dead code (introduced in this task)            |
| Types (TS) | Remove inferable, any→specific                                        |
| Formatting | Consistent semicolons/quotes/commas                                   |
| Naming     | Fix typos, case inconsistencies                                       |
| Temp files | Remove scratch/helper files created for iteration in this task        |

## Not allowed

- Pre-existing dead code (introduced before this task). Note to user; do not delete.
- Logic, structure, features, performance, API changes, test fixes.

## Report

`🧹 Tidyings: Whitespace ✓ Imports ✓ Unused ✓`
