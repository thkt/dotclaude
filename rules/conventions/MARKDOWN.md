---
paths:
  - ".claude/**/*.md"
  - ".ja/**/*.md"
  - "rules/**/*.md"
  - "skills/**/*.md"
  - "agents/**/*.md"
  - "workspace/**/*.md"
---

# Markdown Conventions

Conventions for Markdown files under `.claude/`.

## File scope

| Scope        | Paths                                                             |
| ------------ | ----------------------------------------------------------------- |
| LLM-facing   | `CLAUDE.md`, `agents/**`, `skills/**`, `rules/**`, `workspace/**` |
| Human-facing | `docs/**`, `README.md`                                            |

The `.ja/` translations follow their counterpart's scope.

## Symbols

| Symbol | Use                                 | Example                                                             |
| ------ | ----------------------------------- | ------------------------------------------------------------------- |
| `/`    | Parallel enumeration (AND/OR)       | `Safety First / Output Verifiability`                               |
| `.`    | Separator between independent rules | `Check scope. Do not skip`                                          |
| `()`   | Supplementary condition only        | `Skip for follow-up (same session)`                                 |
| `→`    | Fallback or step sequence           | `README → package.json → ask user` / `Observe → analyze → conclude` |

## Inline code

Judge backticks by whether removing them causes misreading. If it does not, leave the text unwrapped. Being a literal or an identifier is not by itself a reason to wrap. Wrap angle-bracket placeholders like `<branch>` in backticks instead of escaping them.

| Keep                                                                 | Remove                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Identifiers mixed with normal text in a sentence                     | Cells in a column whose entries share one type                     |
| Tokens containing placeholders (one such row keeps the whole column) | Emphasis-only wrapping                                             |
| Escapes and symbols that must stay distinguishable                   | Values self-evident from the column name (Tool column, tool names) |
| Whole commands in a sentence                                         | List items already distinguished by symbols (`[✓]` etc.)           |

## Do not

| Pattern               | Applies to | Fix                                                                       |
| --------------------- | ---------- | ------------------------------------------------------------------------- |
| `≠`                   | All        | Rewrite as positive form or use `is not X`                                |
| `()` for contrast     | All        | Split with `.`                                                            |
| `—` (em-dash)         | All        | Split into sentences with `.`, or replace with `,` / `:` / `-` by context |
| `ANY` / `ALL` in caps | All        | Use normal case                                                           |
| `**bold**`            | LLM-facing | Use tables or sections. Convert bold-first bullets to a table             |
| Emoji in prose        | LLM-facing | Remove. User-visible emoji are the exception                              |
| Unicode decoration    | Prose      | Use ASCII                                                                 |

## Pseudo-headings

Do not end a line with `:` to introduce a table, list, or section. The same applies to an inline `Label: value` colon. Both hint at structure, so promote to a heading (`### Foo`) or a table, or rewrite as prose. Literal colons stay fine (time `14:30`, ratio `2:1`, URLs, paths, table cells).

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

| Pattern               | Reason                                        |
| --------------------- | --------------------------------------------- |
| Circular (A → B → A)  | Creates unresolvable dependencies             |
| Already in CLAUDE.md  | Globally loaded files don't need re-reference |
| Speculative reference | Reference only what the current context reads |

## Out of scope

- Inside code blocks / inline code
