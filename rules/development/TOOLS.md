# Tool Preferences

CLI tool > built-in equivalent. For web fetch and search, reach for the `use-cli-scout` skill first.

## Code search

`ast-grep` carries the parser and the two text tools carry the text. Reaching for `ugrep` on a question about shape returns lines that read alike and miss the ones written differently, and reaching for `ast-grep` on a string search parses files to find what a literal match already had.

| Task                                            | Use                    | When                                         |
| ----------------------------------------------- | ---------------------- | -------------------------------------------- |
| Match or rewrite by AST shape, syntax-tree unit | `ast-grep` (Bash)      | A language ast-grep parses                   |
| Literal string or regex content search          | `ugrep` (Bash)         | Any language, and any file the parser misses |
| File or directory lookup by name                | `bfs` (Bash)           | Any tree                                     |
| Past session search                             | `use-cli-recall` skill | Any language                                 |

## First contact

On first contact with a module or when starting a BACKLOG task, run `use-cli-recall`. See the skill for details.

## Why this file has no frontmatter

A `rules/` file declares its target file glob in `paths:` frontmatter and loads only when editing a matching file (see rules/conventions/SKILLS.md and others). This file governs a decision made before a search starts, which search tool to reach for, and at that point the file being searched is not yet known. No glob can narrow that decision, so this file carries no `paths:` frontmatter. It follows the same frontmatter-less shape as `rules/conventions/PROSE.md`.
