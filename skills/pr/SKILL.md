---
name: pr
description: Analyze branch changes and generate PR description.
when_to_use: PR作って, プルリクエスト, pull request, PR作成
allowed-tools: Bash(git:*) Bash(gh:*) Read AskUserQuestion Skill
model: opus
argument-hint: "[issue reference or context]"
---

# /pr - Pull Request Description Generator

## Input

- Issue reference or context: `$ARGUMENTS` (optional, e.g., `#456`)
- If `$ARGUMENTS` is empty → generate from current branch only

## Execution

| Step | Action                                                                             |
| ---- | ---------------------------------------------------------------------------------- |
| 1    | Analyze: `git status`, `git diff <base>...HEAD`, `git log <base>..HEAD` (parallel) |
| 2    | Detect base branch (see Base Branch Detection)                                     |
| 3    | Select base branch via AskUserQuestion (options: main / develop / [detected])      |
| 4    | UI Change Detection (see below)                                                    |
| 5    | Generate PR title + body following PR template (see below)                         |
| 6    | Refine body inline via prose review (see below)                                    |
| 7    | Preview PR → AskUserQuestion: "Create this PR?"                                    |
| 8    | If UI changes: Skill invoke `use-workflow-pageshot` with PR body (see below)       |
| 9    | Display push command (manual run)                                                  |
| 10   | Create PR: `gh pr create --title "..." --body "..."`                               |
| 11   | If pageshot artifact exists: display artifact path + manual paste guidance         |

## Analysis Sources

| Category | Source                   |
| -------- | ------------------------ |
| Changes  | `git diff <base>...HEAD` |
| Commits  | `git log <base>..HEAD`   |
| Files    | `git diff --name-status` |

## Change Type Detection

| Type     | Keywords                        |
| -------- | ------------------------------- |
| Feature  | feat, add, new, implement       |
| Bug Fix  | fix, bug, issue, resolve        |
| Refactor | refactor, restructure, optimize |
| Docs     | docs, readme, documentation     |

## Language

Read `language` from ${CLAUDE_SKILL_DIR}/../../settings.json and translate the PR body into that language. If unset, default to English. Keep technical terms, code, and identifiers untranslated.

## Title Rules

| Rule          | Format                                               |
| ------------- | ---------------------------------------------------- |
| Prefix        | None (no `feat:`, `fix:`, etc.)                      |
| With Issue    | Use Issue title as-is                                |
| Without Issue | Imperative verb + description (≤72)                  |
| Examples      | `Add user authentication`, `Fix login timeout issue` |

## PR Template

${CLAUDE_SKILL_DIR}/templates/pr.md

### Design Decisions Detection

Aggregate `Design Decisions` at the PR level, not per-commit. Detect from `git diff <base>...HEAD` and `git log <base>..HEAD`:

| Signal                                      | Example                          |
| ------------------------------------------- | -------------------------------- |
| Equal alternatives, explicit choice         | "Used X over Y because..."       |
| Performance / type / compatibility tradeoff | "Chose X to avoid Y"             |
| Deviation from existing patterns            | "Deviated from X for..."         |
| Library / API selection                     | "Selected X (over Y) because..." |

Routine implementation only (no explicit tradeoff) → omit the Design Decisions section.

## Base Branch Detection

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
# Fallback: main → master → develop
```

## UI Change Detection

UI change if `git diff --name-only {base}...HEAD` contains any of these extensions:

| Extension                                       | Kind        |
| ----------------------------------------------- | ----------- |
| `.tsx` / `.jsx` / `.vue` / `.svelte` / `.astro` | Component   |
| `.html`                                         | Page        |
| `.css` / `.scss` / `.sass` / `.less`            | Style       |
| `*.module.css` / `*.module.scss`                | CSS Modules |

No UI change → skip Pageshot Integration.

## Pageshot Integration

Invoke the `use-workflow-pageshot` skill via the Skill tool. Input is the current PR body string.

```
Skill invoke: use-workflow-pageshot
Input: <PR body string>
```

PR body must contain before invoking:

- A `Preview URL: <URL>` line near the top
- A `## How to Test` section (numbered list)

The skill returns a single stdout line:

```
mode=screenshot artifact=/path/to/step-01.png
```

or

```
mode=video artifact=/path/to/capture.mp4
```

On `mode=failed`, report missing items and continue PR creation (skip pageshot).

After PR creation, display:

```text
Pageshot generated: <absolute path>
Drag and drop it into the PR description or first comment on GitHub.
```

## Prose Review

### Structure (PR-specific)

| Check          | Question                                                             |
| -------------- | -------------------------------------------------------------------- |
| Why stated     | Is the reason for the change (not just what) in the top 1-3 lines?   |
| Test evidence  | Is verification concrete (command run, test file, screenshot link)?  |
| Scope          | Is the change focused, or does it bundle unrelated edits?            |
| Reviewer focus | Is the review priority clear ("focus on X", "skim Y")?               |
| Risk surfaced  | Are migration, rollback, or performance risks called out explicitly? |

### Anti-AI-pattern

| Pattern            | Signal                                                                          | Fix                                            |
| ------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| Boilerplate opener | `This PR introduces/implements/adds...`                                         | Start with the problem solved or outcome       |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                               | Drop or replace with specifics (counts, names) |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                             | Use `use`, `do`, `let`                         |
| Vague quantifier   | `various changes`, `multiple improvements`, `several fixes`                     | Enumerate or count                             |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                            | One hedge maximum, or commit                   |
| Filler phrase      | `It should be noted that...`, `Happy to discuss`, `Looking forward to thoughts` | Delete. State the fact or ask directly         |

### Push (Manual)

Never execute `git push` directly. Display the command and wait for confirmation:

```text
Run this to push: git push -u origin HEAD
```

## Error Handling

| Error             | Action                  |
| ----------------- | ----------------------- |
| No commits        | Report "No commits"     |
| No base branch    | Default to main         |
| No git repository | Report "Not a git repo" |
| gh auth failure   | Report auth error       |

## Rules

| Rule                | Detail                                        |
| ------------------- | --------------------------------------------- |
| Title: No prefix    | No `feat:`, `fix:`, `refactor:` etc.          |
| Body: Direct string | Avoid heredoc (`<<EOF`) - sandbox restriction |

## Display Format

Preview shows title, base branch, current branch, summary bullets, and changes table. Success: `Created PR: #<number> <title> <PR URL>`
