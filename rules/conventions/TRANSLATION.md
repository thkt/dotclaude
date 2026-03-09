---
paths:
  - ".ja/**"
---

# JP/EN Translation File Handling

Rules for bilingual EN/JP documentation.

## File Path Convention

- EN: `/path/to/FILE.md`
- JP: `/.ja/path/to/FILE.md`

ADR exception: Written in Japanese by default, no `.ja/` needed.

## Translation File Recognition

Files under `.ja/` are Japanese translations of corresponding English files. Do
not compare for content consistency.

| Path Pattern            | Type           | Treatment             |
| ----------------------- | -------------- | --------------------- |
| `skills/*/SKILL.md`     | EN source      | Primary review target |
| `.ja/skills/*/SKILL.md` | JP translation | Structure-only review |
| `docs/*.md`             | EN source      | Primary review target |
| `.ja/docs/*.md`         | JP translation | Structure-only review |

## Review Rules for Translation Files

| Action      | Items                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------ |
| DO review   | Structure consistency, YAML frontmatter, Mermaid diagrams, Links/references                      |
| DO NOT flag | Different keywords in examples, Translated content, Localized formats, Natural language phrasing |

## @-include Convention

JP files share EN skill/reference files via @-include. Paths must account for
extra `.ja/` depth.

| JP file location             | Path adjustment     | Example                                       |
| ---------------------------- | ------------------- | --------------------------------------------- |
| `.ja/skills/*/`              | Add one `../` vs EN | `[@../../lib/sow-resolution.md]`              |
| `.ja/skills/.../references/` | Add two `../` vs EN | `[@../../../../skills/lib/sow-resolution.md]` |

Resolve @-include path from JP file's directory; verify it reaches the EN target
under `.claude/`.

## Example: Valid EN/JP Difference

This is NOT an issue:

| EN (`skills/code/SKILL.md`)       | JP (`.ja/skills/code/SKILL.md`) |
| --------------------------------- | ------------------------------- |
| `Navigate to https://example.com` | `https://example.com に移動`    |
| `Click element (uid: abc)`        | `要素をクリック（uid: abc）`    |
