---
description:
  Proofread and auto-fix Japanese text using textlint. Use when user mentions
  校正して, kousei, textlint, 日本語チェック, 文章チェック.
allowed-tools: Bash(bun:*), Bash(gh:*), Bash(cat:*), Read
argument-hint: "[file path, #issue, #pr, or text]"
---

# /kousei - Japanese Proofreading

Proofread and auto-fix Japanese text using textlint.

## Input

- `$1`: file path / `#123` (Issue) / `#pr123` (PR) / raw text
- If empty → target the most recently edited `.md` file

## Execution

| Step | Action                                              |
| ---- | --------------------------------------------------- |
| 1    | Determine target                                    |
| 2    | Get original content                                |
| 3    | Run `bun x textlint --fix`                          |
| 4    | Structure review (AI-powered, see checklist below)  |
| 5    | Show textlint diff + structure feedback             |
| 6    | For Issue/PR → present changes, confirm before push |

### Target Resolution

| Input Pattern      | Action                                                |
| ------------------ | ----------------------------------------------------- |
| `*.md` file path   | Run `textlint --fix` on the file                      |
| `#N` (Issue number) | `gh issue view N --json body` → fix → `gh issue edit` |
| `#prN` (PR number)  | `gh pr view N --json body` → fix → `gh pr edit`       |
| Other text         | Write to temp file → fix → display result             |
| Empty              | `git diff --name-only` to find recent `.md` files     |

### textlint Execution

```bash
cd ~/.claude/textlint && bun x textlint --fix --config .textlintrc.json "$file"
```

### Structure Review (Anti-Work-Slop)

After textlint fixes, review the text against these structural quality checks:

| Check              | Question                                                         |
| ------------------ | ---------------------------------------------------------------- |
| Author's judgment  | Is the author's own conclusion stated in 1-3 lines before AI output? AI output should be supporting material, not the main content. |
| Half-able          | Can this be cut in half? If not, the author may not know what matters. |
| Fact vs opinion    | Are facts, assumptions, and proposals clearly labeled and separated? |
| Action clarity     | Is the expected reader action explicit? ("Review X" not "ご確認ください") |
| Reader cost        | Does this reduce the reader's cognitive load, or shift work to them? |

Report only items that need improvement. If structure is sound, skip silently.

Format:

```
Structure review:
- [Check name]: [specific suggestion]
```

### Issue/PR Update Flow

1. Fetch body → write to temp `.md` file
2. Run `textlint --fix`
3. Show diff
4. Ask user: "Apply these changes?"
5. On approval → `gh issue edit N --body "..."` or `gh pr edit N --body "..."`

## Display Format

When changes found:

```
Proofread complete: N fixes applied

[diff of changes]
```

When no issues:

```
Proofread complete: no issues found
```
