---
name: audit-skill-craft
description: Judge a SKILL.md against craft axes (single responsibility, description distinctiveness, imperative voice, verifiable completion, calibration, progressive disclosure) and apply the fixes the audit surfaces. Do not use for format-presence-only checks (use reviewer-prompt) or reproducibility loops (use /tuning).
when_to_use: スキルの書き味, skill craft, スキル品質監査, SKILL.md 監査, skill audit, 書き味判定, mattpocock パターン, スキル整形
allowed-tools: Read Write Edit LS Bash(ugrep:*) Bash(bfs:*) Bash(git:*) Task AskUserQuestion
model: opus
argument-hint: "[skill-path]"
---

# /audit-skill-craft - Skill Craft Auditor

Judge a SKILL.md against the craft axes in rules/conventions/SKILLS.md and the format rules in MARKDOWN.md, then apply the fixes the audit surfaces. This pairs the format-presence judgment of reviewer-prompt with craft-quality judgment and in-place repair.

## When to Use

- A SKILL.md works but reads poorly, sprawls, or carries a vague description
- A skill was imported from an external collection and needs conversion to these conventions
- A freshly written skill needs a craft pass before commit

## Distinction

Four tools touch prompt files. This table draws the boundary so the audit avoids duplicating them.

| Tool                     | Scope                                                         | Edits files          |
| ------------------------ | ------------------------------------------------------------- | -------------------- |
| audit-skill-craft (this) | Craft quality of a SKILL.md plus the format fixes it surfaces | Yes (Edit)           |
| reviewer-prompt          | Format presence (bold, frontmatter fields, prose-to-table)    | No (read-only)       |
| tuning                   | Empirical reproducibility loop via fresh subagents            | Yes (one patch/iter) |
| polish                   | General AI-slop cleanup across any file                       | Yes                  |

## Input

`$ARGUMENTS` may carry a skill path and optional flags. Resolve before use.

- Split on whitespace; the non-flag token is the skill path, empty means auto-detect
- A path to a SKILL.md or its containing directory is accepted; resolve a directory to its SKILL.md
- Auto-detect order: most recently changed `skills/*/SKILL.md` in `git status`, then by mtime
- `--no-format` skips the reviewer-prompt spawn in Step 4 for a craft-only pass
- Reject unknown flags with an explicit error rather than silently ignoring them
- If the resolved file is not a SKILL.md, abort with the reason

## Execution

| Step | Action                                                                            |
| ---- | --------------------------------------------------------------------------------- |
| 1    | Resolve the target SKILL.md (auto-detect or `$ARGUMENTS`)                         |
| 2    | Load the judgment basis: SKILLS.md Craft axes + MARKDOWN.md format rules          |
| 3    | Judge the target against the 6 craft axes; record each verdict with line evidence |
| 4    | Spawn reviewer-prompt via Task for format findings (skip with `--no-format`)      |
| 5    | Merge craft + format findings; classify each fix as mechanical or judgment        |
| 6    | Apply mechanical fixes via Edit; present judgment fixes for confirmation          |
| 7    | Re-read the file; verify it now passes the axes it failed and adds no violation   |
| 8    | Print a summary table of axes, verdicts, and applied fixes                        |

### Step 3: Craft Judgment

Judge against the 6 axes in the SKILLS.md Craft section. For each axis, record pass or fail plus the line(s) that triggered the verdict. Pattern detail and Good/Bad pairs live in ${CLAUDE_SKILL_DIR}/references/mattpocock-patterns.md.

### Step 5: Fix Classification

Mechanical fixes preserve meaning; judgment fixes change wording or structure. Surface judgment fixes as proposed text and apply only the confirmed ones.

| Class      | Examples                                                               | Handling                     |
| ---------- | ---------------------------------------------------------------------- | ---------------------------- |
| Mechanical | bold to table, pseudo-heading to heading, trailing-summary cut, filler | Apply via Edit               |
| Judgment   | description rewrite, responsibility split, adding a stop condition     | Propose; apply after confirm |

### Step 6: Responsibility Split

When an axis flags 2+ unrelated responsibilities, do not merge or split silently. Present the split boundary and ask via AskUserQuestion whether to split into sibling skills or keep as-is with a recorded exception.

### Step 7: Dogfood Verification

Re-read the edited file. Confirm every previously-failing axis now passes and no fix introduced a new MARKDOWN.md violation. A fix that trades one violation for another is not done.

## Output

- Edited SKILL.md with mechanical fixes applied and confirmed judgment fixes applied
- Console summary: per-axis verdict, applied fixes, deferred proposals
- No separate report file; the diff is the deliverable

## Out of Scope

- Creating a skill from scratch (write the SKILL.md first, then audit it)
- Reference-file domain content (craft axes target SKILL.md structure)

## Acceptance Criteria

- [ ] Target SKILL.md resolved and confirmed to exist
- [ ] All 6 craft axes judged with line evidence
- [ ] Mechanical fixes applied; judgment fixes confirmed-and-applied or recorded as deferred
- [ ] Edited file introduces no new MARKDOWN.md violation (dogfood re-read)
- [ ] Summary lists every axis verdict
