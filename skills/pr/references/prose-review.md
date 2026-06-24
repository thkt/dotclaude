# Prose Review

Write for a teammate who shares the context and can open the links. Not for a zero-context reader. A PR carries the intent of the diff and the review path; the code's what is carried by the diff itself. Do not write a line whose removal would not mislead the reader. Lexical empty phrases are not handled here; check them against the empty-phrase file matching the body language.

## Structure (PR-specific)

Confirm the structure the PR body must satisfy.

| Check          | Question                                                             |
| -------------- | -------------------------------------------------------------------- |
| Why stated     | Is the reason for the change (not just what) in the top 1-3 lines?   |
| Test evidence  | Is verification concrete (command run, test file, screenshot link)?  |
| Scope          | Is the change focused, or does it bundle unrelated edits?            |
| Reviewer focus | Is the review priority clear ("focus on X", "skim Y")?               |
| Risk surfaced  | Are migration, rollback, or performance risks called out explicitly? |
