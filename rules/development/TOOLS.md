# Tool Preferences

CLI tool > built-in equivalent. Bash commands are auto-rewritten to RTK by
PreToolUse hook (no manual action).

| Purpose     | Use                   | NOT             | Condition                 |
| ----------- | --------------------- | --------------- | ------------------------- |
| URL fetch   | `scout fetch`         | `WebFetch`      | Always (Bash)             |
| Web search  | `scout search`        | `WebSearch`     | Always (Bash)             |
| GitHub repo | `scout repo-overview` | `gh` / `fetch`  | Repo overview (Bash)      |
| Code search | `yomu search`         | `Task(Explore)` | Frontend concept search   |
|             | `Task(Explore)`       | —               | Non-frontend or unindexed |
| Session log | `recall "query"`      | `Grep *.jsonl`  | Past session search       |

## scout

Web search & page fetch CLI. Run directly via Bash.

```bash
scout search "query"                    # Web search (Gemini Grounding)
scout fetch <url>                       # Fetch page as Markdown
scout research "query"                  # Deep research (search + fetch + compile)
scout repo-overview owner/repo          # GitHub repo overview (stars, issues, PRs, releases, README)
scout repo-tree owner/repo              # List files in remote GitHub repo
scout repo-read owner/repo path/to/file # Read a file from remote GitHub repo
```

## yomu

Frontend (TS/TSX/JS/CSS/HTML) code search CLI. Run directly via Bash.

```bash
yomu search "query"           # Semantic code search (concept, identifier, related)
yomu search "query" --limit 5 # Limit results
yomu index                    # Update chunk index incrementally
yomu rebuild                  # Rebuild chunk index from scratch
yomu impact <file_or_symbol>  # Analyze impact of changes
yomu status                   # Show index statistics
```

Prefer yomu even for simple searches to build embedding coverage over time.

| yomu (default)                          | grep/glob (exception)                   |
| --------------------------------------- | --------------------------------------- |
| Concept: "form validation", "auth flow" | Literal: error messages, regex          |
| Related: "hooks that do Y"              | Known path: `src/components/Button.tsx` |
| Known identifier: `useAuth`             | File listing: `**/*.tsx`                |
| Unknown name: "where does X happen"     |                                         |

## recall

Past Claude Code / Codex session search CLI (FTS5). Run directly via Bash.

```bash
recall "query"                    # Full-text search across all sessions
recall "query" --days 7           # Last N days only
recall "query" --project /path    # Filter by project path (prefix match)
recall "query" --limit 5          # Max results (default: 10)
recall --reindex                  # Force full index rebuild
```

| recall (default)                   | Grep \*.jsonl (exception)   |
| ---------------------------------- | --------------------------- |
| Past solutions: "how did I fix X"  | Current session only        |
| Pattern recall: "what tool for Y"  | Specific known session file |
| Cross-project: "where did I use Z" |                             |

## RTK (Rust Token Killer)

Token-optimized CLI proxy. Bash commands are auto-rewritten by hook — no manual
`rtk` prefix needed.

### Meta Commands (use directly)

```bash
rtk gain              # Token savings analytics
rtk gain --history    # Command usage history with savings
rtk discover          # Analyze Claude Code history for missed opportunities
```

### Auto-rewrite Coverage

| Category   | Commands                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Git/GitHub | git (status/diff/log/add/commit/push/pull/branch/fetch/stash/show), gh (pr/issue/run/api/release) |
| File ops   | cat/bat → read, rg/grep, ls/eza, tree, find/fd, diff, head                                        |
| JS/TS      | vitest, tsc, vue-tsc, eslint, prettier, playwright, prisma, npm run/test, pnpm test/lint/tsc      |
| Rust       | cargo (test/build/clippy/check/install/fmt)                                                       |
| Python     | pytest, ruff, pip, mypy (direct and `python -m`)                                                  |
| Go         | go (test/build/vet), golangci-lint                                                                |
| Containers | docker (ps/images/logs/run/build/exec/compose), kubectl (get/logs/describe/apply)                 |
| Network    | curl, wget                                                                                        |
| Package    | pnpm (list/ls/outdated), uv pip                                                                   |

### Notes

- If `rtk gain` fails: may have wrong rtk installed (reachingforthejack/rtk)
- Verify: `rtk --version` should show `rtk X.Y.Z`
