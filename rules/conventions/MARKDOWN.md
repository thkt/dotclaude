---
paths:
  - ".claude/**/*.md"
---

# Markdown Conventions

Conventions for Markdown files under `.claude/`.

## File scope

| Scope      | Paths                                                             |
| ---------- | ----------------------------------------------------------------- |
| LLM-facing | `CLAUDE.md`, `agents/**`, `skills/**`, `rules/**`, `workspace/**` |
| Human      | `docs/**`, `README.md`                                            |

Bilingual `.ja/` copies follow their counterpart's scope.

## Symbols

| Symbol | Use                                 | Example                                                             |
| ------ | ----------------------------------- | ------------------------------------------------------------------- |
| `/`    | Parallel enumeration (AND/OR)       | `Safety First / Output Verifiability`                               |
| `.`    | Separator between independent rules | `Check scope. Do not skip`                                          |
| `()`   | Supplementary condition only        | `Skip for follow-up (same session)`                                 |
| `→`    | Order (fallback or step sequence)   | `README → package.json → ask user` / `Observe → analyze → conclude` |

## Do not

| Pattern               | Applies to | Reason                                             |
| --------------------- | ---------- | -------------------------------------------------- |
| `≠`                   | All        | Rewrite as positive form. Use `is not X`           |
| `()` for contrast     | All        | Split with `.`                                     |
| `—` (em-dash)         | Prose      | Split into separate sentences with `.`             |
| `ANY` / `ALL` in caps | All        | Use normal case                                    |
| `**bold**`            | LLM-facing | Token waste. Use tables or sections instead        |
| Emoji in prose        | LLM-facing | Token waste. User-visible emoji are the exception  |
| Unicode decoration    | All        | Use ASCII in prose. Tables allow Unicode symbols   |
| Bold-first bullets    | All        | `- **Label:** text` pattern. Use only if aids scan |

## Pseudo-headings

Do not end a line with `:` to introduce a table, list, or section. Promote to a proper heading (`### Foo`) or rewrite as prose. The same applies to an inline `Label: value` colon. It hints at structure, so promote it to a table or rewrite as prose. Literal colons stay fine (time `14:30`, ratio `2:1`, URLs, paths, table cells).

| Violation                                  | Fix                          |
| ------------------------------------------ | ---------------------------- |
| `Only excluded:` followed by a table       | `### Exclusions` + table     |
| `When unable to verify:` followed by steps | `#### When unable to verify` |

## Table placement

Put the explanation (rule, context, exceptions) before the table. Do not continue the paragraph after the table. Tables are for enumeration, not for splitting prose.

## Prose wrapping

Do not insert physical line breaks inside paragraphs. Write each paragraph on a single line. Tooling handles soft-wrapping.

## Reference depth

| Scope      | Max levels |
| ---------- | ---------- |
| Skills     | 1          |
| Rules/Docs | 3          |

## Forbidden references

| Pattern              | Reason                                           |
| -------------------- | ------------------------------------------------ |
| Circular (A → B → A) | Creates unresolvable dependencies                |
| Already in CLAUDE.md | Globally loaded files don't need re-reference    |
| Unneeded reference   | Reference only when required for current context |

## Out of scope

- Code blocks / inline code
- ADR Japanese prose
