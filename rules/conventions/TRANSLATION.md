# JP/EN Translation File Handling

Guidelines for reviewing bilingual documentation with English sources and Japanese translations.

## File Path Convention

- EN: `/path/to/FILE.md`
- JP: `/.ja/path/to/FILE.md`

ADR exception: Written in Japanese by default, no `.ja/` needed.

## Translation File Recognition

Files under `.ja/` directory are Japanese translations of corresponding English files. They should NOT be compared for content consistency.

| Path Pattern        | Type           | Treatment             |
| ------------------- | -------------- | --------------------- |
| `commands/*.md`     | EN source      | Primary review target |
| `.ja/commands/*.md` | JP translation | Structure-only review |
| `docs/*.md`         | EN source      | Primary review target |
| `.ja/docs/*.md`     | JP translation | Structure-only review |

## Review Rules for Translation Files

| Action      | Items                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------ |
| DO review   | Structure consistency, YAML frontmatter, Mermaid diagrams, Links/references                      |
| DO NOT flag | Different keywords in examples, Translated content, Localized formats, Natural language phrasing |

## Example: Valid EN/JP Difference

This is NOT an issue:

| EN (`commands/workflow/create.md`) | JP (`.ja/commands/workflow/create.md`) |
| ---------------------------------- | -------------------------------------- |
| `Navigate to https://example.com`  | `https://example.com に移動`           |
| `Click element (uid: abc)`         | `要素をクリック（uid: abc）`           |
