---
name: issue
description: Generate GitHub Issue with structured title and body. Premise check + critic-design challenge verify drafted claims before posting.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(mv:*) Bash(ugrep:*) Read Task AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

Generate a GitHub Issue with a structured title and body, verifying drafted claims via premise check and critic-design challenge before posting.

## Input

`$ARGUMENTS` is the issue description. If empty, prompt for it via AskUserQuestion. Type is inferred from the description (bug / feature / docs / chore).

## Execution

A body supplied verbatim by the user skips premise check, prose review, and Adversarial Challenge, posting unchanged.

1. Read `.claude/OUTCOME.md`; if absent, generate the stub via /outcome
2. Detect type from description (§ Type Detection)
3. Read template: ${CLAUDE_SKILL_DIR}/templates/<type>.md
4. Generate title + body following template; mark fixed/tentative (§ Confidence Marking)
5. Filter drafted claims via premise check (§ Premise Check)
6. Refine body inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md`
7. Challenge body via critic-design, feature/bug only (§ Adversarial Challenge)
8. Preview issue + tentative items → AskUserQuestion: "Create this issue?"
9. Execute via body-file (sandbox-compatible)
10. Capture issue URL from command output

## Type Detection

Default to `feature` if unclear.

| Type    | Prefix    | When to use                                             |
| ------- | --------- | ------------------------------------------------------- |
| bug     | [Bug]     | Something existing is broken or not working as expected |
| feature | [Feature] | New capability or enhancement request                   |
| docs    | [Docs]    | Documentation additions or corrections                  |
| chore   | [Chore]   | Maintenance, config, or dependency updates              |

## Language

Read `language` from ${CLAUDE_SKILL_DIR}/../../settings.json and translate the issue body and templates into that language. If unset, default to English. Keep technical terms, code, and identifiers untranslated.

## Labels

| Type    | Labels               |
| ------- | -------------------- |
| Bug     | bug, priority:\*     |
| Feature | enhancement, feature |
| Task    | task, chore          |

A bug's `priority:*` label is one of the following.

| Label             | Meaning            |
| ----------------- | ------------------ |
| priority:critical | Production down    |
| priority:high     | Significant impact |
| priority:medium   | Normal             |
| priority:low      | Nice to have       |

## Confidence Marking

Mark which parts of the body are fixed vs tentative, so the implementer can tell a requirement to honor from a starting point to refine. Applied at generation time; it is not a verification pass, and the default direction decides itself without a codebase scan.

| Origin                                                                          | State     | Notation                          |
| ------------------------------------------------------------------------------- | --------- | --------------------------------- |
| User decided it, or it is the ask (WHAT, AC, explicit Scope/Constraints)        | fixed     | unmarked                          |
| AI-inferred HOW (placement, approach, format), or a decision the user left open | tentative | `(tentative: <action at pickup>)` |

The marker word follows the language setting (`仮` under Japanese).

Mark sparingly, only where it changes implementer action. Annotating every line collides with the Anti-AI-pattern rules (Hedge stacking, Compulsive section); a body that is all fixed gets no marks.

Tentative marks stay inline at the item they qualify. The Premises section stays reserved for issue-level premises that do not attach to a specific line (design refs, global assumptions). Premise Check's provisional downgrade emits the same marker, distinguished only by the action phrase.

| Why tentative                                              | Action phrase                                         |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| Decision not yet settled (AI inferred a plausible default) | "decide at pickup" / "change if a better fit appears" |
| Fact not yet verified (carried from Premise Check)         | "recheck at pickup"                                   |

## Premise Check

Filters claims already drafted into the body. Not a discovery phase. No agent spawns inside this check (the only spawn is critic-design at the challenge step), no cross-codebase audit, no digging beyond the drafted claims themselves. A claim either resolves within 2-3 targeted probes or gets downgraded to provisional.

| Claim type                                    | Action                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Current-code claim ("X currently does Y")     | Verify with 2-3 targeted Read/ugrep probes; annotate in body ("grep-confirmed")                                                        |
| Claim still ambiguous after the probes        | Downgrade to provisional: mark the claim inline with a recheck marker (Premises only if issue-level), never as fact                    |
| Claim contradicted by the source              | Rewrite the body to match the source. If the mismatch matters (user report vs code), state it under Premises with the verification ask |
| External design ref (Figma, design doc, spec) | Always unverified, since the skill cannot know the source is current. Link + "confirm latest before starting"                          |
| Target file list                              | Annotate "candidates as of writing; recheck on pickup"                                                                                 |
| Code example in body                          | Annotate as illustrative, not the implementation: "reference shape; final form decided at pickup"                                      |

## Adversarial Challenge

feature/bug only; docs/chore skip it. Spawn one critic-design Task directly with the drafted body (not via /challenge). The critic argues against the issue (hidden premises, missed dependencies, scope contradictions); it does not gate it. Final judgment stays with the user at confirm time.

Critic findings never enter the issue body. They are confirm-time review material: fold or dismiss at preview.

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

The tentative block collects every inline tentative mark plus the Premises section. It adds no new content and mirrors what the body already carries; keep it short. If there are zero tentative items, omit the block. Omit the critic block when empty (docs/chore, or verdict confirmed).

### Success

Created: `#<number>` <title> <issue URL>
