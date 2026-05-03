---
name: issue
description: Generate GitHub Issue with structured title and body.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Read AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

## Input

- Issue description: `$ARGUMENTS`
- If `$ARGUMENTS` is empty → prompt for description via AskUserQuestion
- Type is inferred from description (bug / feature / docs / chore)

## Execution

| Step | Action                                                 |
| ---- | ------------------------------------------------------ |
| 1    | Detect type from description (see Type Detection)      |
| 2    | Read template: ${CLAUDE_SKILL_DIR}/templates/<type>.md |
| 3    | Generate title + body following template               |
| 4    | Refine body inline via prose review (see below)        |
| 5    | Preview issue → AskUserQuestion: "Create this issue?"  |
| 6    | Execute via body-file (sandbox-compatible)             |
| 7    | Capture issue URL from command output                  |

## Type Detection

| Type    | Prefix    | When to use                                             |
| ------- | --------- | ------------------------------------------------------- |
| bug     | [Bug]     | Something existing is broken or not working as expected |
| feature | [Feature] | New capability or enhancement request                   |
| docs    | [Docs]    | Documentation additions or corrections                  |
| chore   | [Chore]   | Maintenance, config, or dependency updates              |

Default to `feature` if unclear.

## Language

Read `language` from ${CLAUDE_SKILL_DIR}/../../settings.json and translate the issue body into that language. If unset, default to English. Keep technical terms, code, and identifiers untranslated.

## Templates

| Type    | Template                                 |
| ------- | ---------------------------------------- |
| bug     | ${CLAUDE_SKILL_DIR}/templates/bug.md     |
| feature | ${CLAUDE_SKILL_DIR}/templates/feature.md |
| docs    | ${CLAUDE_SKILL_DIR}/templates/docs.md    |
| chore   | ${CLAUDE_SKILL_DIR}/templates/chore.md   |

## Labels

| Type    | Labels               |
| ------- | -------------------- |
| Bug     | bug, priority:*      |
| Feature | enhancement, feature |
| Task    | task, chore          |

## Priority

| Label             | Meaning            |
| ----------------- | ------------------ |
| priority:critical | Production down    |
| priority:high     | Significant impact |
| priority:medium   | Normal             |
| priority:low      | Nice to have       |

## Prose Review

### Structure (Issue-specific)

| Check            | Question                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| Problem stated   | Is the problem or request in 1-3 lines at the top?                       |
| Reproducible     | Bug: are reproduction steps concrete? Feature: is the use case concrete? |
| Expected outcome | Is the expected behavior explicit, not left for the reader to infer?     |
| Reader action    | Is the ask specific ("review spec", "investigate cause", "decide by X")? |
| Scope            | Is the issue focused on one problem, not a dump of related concerns?     |

### Anti-AI-pattern

| Pattern            | Signal                                                                                   | Fix                                            |
| ------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Boilerplate opener | `This issue describes/reports/proposes...`                                               | Start with the problem, not self-description   |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                                        | Drop or replace with specifics (counts, names) |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                                      | Use `use`, `do`, `let`                         |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`                                    | Enumerate or count                             |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                                     | One hedge maximum, or commit                   |
| Filler phrase      | `It should be noted that...`, `Looking forward to your thoughts`, `Any feedback welcome` | Delete. State the fact or ask directly         |

## Sandbox-Compatible Create

```bash
cat > /tmp/claude/issue-body.md << 'EOF'
<body>
EOF
gh issue create --title "<title>" --body-file /tmp/claude/issue-body.md
mv /tmp/claude/issue-body.md ~/.Trash/ 2>/dev/null || true
```

## Error Handling

| Error              | Action                  |
| ------------------ | ----------------------- |
| No description     | Prompt for description  |
| Template not found | Use default format      |
| No git repository  | Report "Not a git repo" |
| gh auth failure    | Report auth error       |

## Display Format

### Preview

```markdown
## Issue Preview

> <title>

### Body

<body content>
```

### Success

Created: `#<number>` <title> <issue URL>
