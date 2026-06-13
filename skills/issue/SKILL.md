---
name: issue
description: Generate GitHub Issue with structured title and body. Premise check + critic-design challenge verify drafted claims before posting.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Bash(ugrep:*) Read Task AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

## Input

- Issue description: `$ARGUMENTS`
- If `$ARGUMENTS` is empty → prompt for description via AskUserQuestion
- Type is inferred from description (bug / feature / docs / chore)

## Execution

A body supplied verbatim by the user skips steps 4-6 and posts unchanged.

| Step | Action                                                                                  |
| ---- | --------------------------------------------------------------------------------------- |
| 0    | Read `.claude/OUTCOME.md`; if absent, generate the stub via /outcome                    |
| 1    | Detect type from description (see Type Detection)                                       |
| 2    | Read template: ${CLAUDE_SKILL_DIR}/templates/<type>.md                                  |
| 3    | Generate title + body following template; mark fixed/tentative (see Confidence Marking) |
| 4    | Filter drafted claims via premise check (see Premise Check)                             |
| 5    | Refine body inline via prose review (see below)                                         |
| 6    | Challenge body via critic-design, feature/bug only (see Adversarial Challenge)          |
| 7    | Preview issue + tentative items → AskUserQuestion: "Create this issue?"                 |
| 8    | Execute via body-file (sandbox-compatible)                                              |
| 9    | Capture issue URL from command output                                                   |

## Type Detection

Default to `feature` if unclear.

| Type    | Prefix    | When to use                                             |
| ------- | --------- | ------------------------------------------------------- |
| bug     | [Bug]     | Something existing is broken or not working as expected |
| feature | [Feature] | New capability or enhancement request                   |
| docs    | [Docs]    | Documentation additions or corrections                  |
| chore   | [Chore]   | Maintenance, config, or dependency updates              |

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
| Bug     | bug, priority:\*     |
| Feature | enhancement, feature |
| Task    | task, chore          |

## Priority

| Label             | Meaning            |
| ----------------- | ------------------ |
| priority:critical | Production down    |
| priority:high     | Significant impact |
| priority:medium   | Normal             |
| priority:low      | Nice to have       |

## Confidence Marking

Mark which parts of the body are fixed vs tentative, so the implementer can tell a requirement to honor from a starting point to refine. Applied at generation time (Step 3); it is not a verification pass and triggers no investigation. Default direction decides itself without a codebase scan.

| Origin                                                                          | State     | Notation                          |
| ------------------------------------------------------------------------------- | --------- | --------------------------------- |
| User decided it, or it is the ask (WHAT, AC, explicit Scope/Constraints)        | fixed     | unmarked                          |
| AI-inferred HOW (placement, approach, format), or a decision the user left open | tentative | `(tentative: <action at pickup>)` |

An AI-inferred approach is tentative by definition, so marking it needs no investigation to promote it, which keeps the no-prefetch principle intact. The marker word follows the language setting (`仮` under Japanese).

Mark sparingly, only where it changes implementer action. Annotating every line collides with the Anti-AI-pattern rules (Hedge stacking, Compulsive section); a body that is all fixed gets no marks.

The existing code-example and target-file annotations are instances of this rule. `reference shape; final form decided at pickup` is a tentative HOW; `candidates as of writing; recheck on pickup` is an unverified fact. Premise Check's provisional downgrade emits the same marker, one notation distinguished only by the action phrase.

Tentative marks stay inline at the item they qualify. The Premises section stays reserved for issue-level premises that do not attach to a specific line (design refs, global assumptions). The action phrase tells the implementer what to do, splitting by why the item is tentative.

| Why tentative                                              | Action phrase                                         |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| Decision not yet settled (AI inferred a plausible default) | "decide at pickup" / "change if a better fit appears" |
| Fact not yet verified (carried from Premise Check)         | "recheck at pickup"                                   |

## Premise Check

Filters claims already drafted into the body. Not a discovery phase: no agent spawns inside this check (the skill's only spawn is critic-design at the challenge step), no cross-codebase audit, no digging beyond the drafted claims themselves. A claim either resolves within 2-3 targeted probes or gets downgraded to provisional; never investigate to rescue it.

| Claim type                                    | Action                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Current-code claim ("X currently does Y")     | Verify with 2-3 targeted Read/ugrep probes; annotate in body ("grep-confirmed")                                                        |
| Claim still ambiguous after the probes        | Downgrade to provisional: mark the claim inline with a recheck marker (Premises only if issue-level), never as fact                    |
| Claim contradicted by the source              | Rewrite the body to match the source. If the mismatch matters (user report vs code), state it under Premises with the verification ask |
| External design ref (Figma, design doc, spec) | Always unverified, since the skill cannot know the source is current. Link + "confirm latest before starting"                          |
| Target file list                              | Annotate "candidates as of writing; recheck on pickup"                                                                                 |
| Code example in body                          | Annotate as illustrative, not the implementation: "reference shape; final form decided at pickup"                                      |

## Prose Review

Write for a teammate who shares context and can open the linked docs, not a zero-context reader. The issue carries the delta; links carry the background.

### Structure (Issue-specific)

| Check             | Question                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Problem stated    | Is the problem or request in 1-3 lines at the top?                                       |
| Reproducible      | Bug: are reproduction steps concrete? Feature: is the use case concrete?                 |
| Expected outcome  | Is the expected behavior explicit, not left for the reader to infer?                     |
| Reader action     | Is the ask specific ("review spec", "investigate cause", "decide by X")?                 |
| Scope             | Is the issue focused on one problem, not a dump of related concerns?                     |
| Outcome alignment | Does this advance the outcome state? If it steps into Non-goals, flag explicitly in body |

### Anti-AI-pattern

| Pattern            | Signal                                                                                   | Fix                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Boilerplate opener | `This issue describes/reports/proposes...`                                               | Start with the problem, not self-description                                               |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                                        | Drop or replace with specifics (counts, names)                                             |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                                      | Use `use`, `do`, `let`                                                                     |
| Vague quantifier   | `various issues`, `multiple concerns`, `several bugs`                                    | Enumerate or count                                                                         |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                                     | One hedge maximum, or commit                                                               |
| Filler phrase      | `It should be noted that...`, `Looking forward to your thoughts`, `Any feedback welcome` | Delete. State the fact or ask directly                                                     |
| Doc transcription  | Restating linked design-doc content in the issue                                         | Link + one-line takeaway; write only the delta                                             |
| Repeated rationale | Same design reason explained twice in one issue                                          | State once, where the decision lands                                                       |
| Bold overuse       | Bold scattered on every other line                                                       | Headings carry structure; bold only warnings                                               |
| Over-specified AC  | AC spelling out authoring details (story names, addon config)                            | Keep the criterion, drop authoring details. UI component issues keep Storybook/a11y as DoD |
| Compulsive section | Optional section filled with nothing to say                                              | Omit empty optional sections                                                               |

## Adversarial Challenge

feature/bug only; docs/chore skip it. Spawn one critic-design Task directly with the drafted body (not via /challenge). The critic argues against the issue (hidden premises, missed dependencies, scope contradictions); it does not gate it. Final judgment stays with the user at confirm time.

Critic findings never enter the issue body. They are confirm-time review material: fold or dismiss at preview. The body's Premises section stays reserved for issue-level premises that do not attach to a specific line (design refs, global assumptions), matching how humans write it.

| Input field      | Mapping                                 |
| ---------------- | --------------------------------------- |
| source           | /issue                                  |
| artifact_type    | spec                                    |
| approach         | What & Why section                      |
| decisions        | Scope (In/Out) + Constraints + Approach |
| trade-offs       | Stated trade-offs, if any               |
| referenced_files | Target files + external design refs     |

| Verdict        | Handling                                                                                |
| -------------- | --------------------------------------------------------------------------------------- |
| confirmed      | Proceed to preview                                                                      |
| weakened       | Fold accepted findings into the body; present the rest at preview as ephemeral critique |
| needs_revision | Revise the body once; do not re-spawn                                                   |

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

### Tentative items (N)

- <item>: <action at pickup>

### Critic findings (not posted)

- <finding>: fold into body or dismiss
```

The tentative block collects every inline tentative mark plus the Premises section, covering both decide-type (AI-inferred HOW) and verify-type (unverified facts, design refs), each with its action phrase. It adds no new content at preview time and mirrors what the body already carries. This is the reader's single signal for what is not yet fixed. If there are zero tentative items, omit the block. Keep it short. Omit the critic block when empty (docs/chore, or verdict confirmed).

### Success

Created: `#<number>` <title> <issue URL>
