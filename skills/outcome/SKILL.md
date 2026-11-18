---
name: outcome
description: Generates and updates .claude/OUTCOME.md interactively. When the file is absent or empty (Behavior blank or TBD only), collects content via AskUserQuestion and writes the stub; when present, shows the current state and applies updates.
when_to_use: OUTCOME作って, OUTCOME更新, アウトカム定義, create outcome, update outcome
allowed-tools: Read Write Edit AskUserQuestion Bash(${CLAUDE_SKILL_DIR}/scripts/*) Bash(git:*) Bash(gh pr:*) Bash(gh repo view:*) Bash(cat:*)
model: opus
argument-hint: "[--no-publish]"
---

# /outcome - OUTCOME.md generation and update

The landing point when another skill detects a missing OUTCOME.md. Returning a hard stop or a warning leaves the outcome empty, so collect it interactively and generate.

## Branch

Run ${CLAUDE_SKILL_DIR}/scripts/validate-outcome.ts .claude/OUTCOME.md and enter the flow its JSON `flow` names. The script owns the criteria.

| state  | Condition                   | flow     |
| ------ | --------------------------- | -------- |
| absent | File absent                 | generate |
| empty  | Behavior blank, or TBD only | generate |
| ok     | Behavior carries content    | update   |

## Generate

1. Read ${CLAUDE_SKILL_DIR}/templates/outcome.md
2. Collect Behavior, Non-goals, Constraints in one AskUserQuestion call, one question per item. Behavior needs 1 or more entries with the subject named
3. Run each Behavior through the Outcome test; rewrite failures and re-present to the user
4. Fill the template and Write `.claude/OUTCOME.md`. Neither the opening prose nor Indicators is collected, so skip the prose and drop Indicators with its heading
5. Re-run validate-outcome.ts and fix until `errors` is empty. `placeholder_left` is a surviving placeholder, `missing_section` a dropped heading
6. Publish (§ Publish)

## Update

1. Read `.claude/OUTCOME.md` and present each section as it stands. Show the opening prose and Indicators as unwritten when the generate flow dropped them
2. Confirm which sections change and what they become via AskUserQuestion. This flow is the only one that can add the opening prose and Indicators
3. Run each changed Behavior through the Outcome test, then Edit
4. Re-run validate-outcome.ts and confirm `errors` is empty
5. When `warnings` carries `missing_indicator`, ask the user whether to add that indicator. It names an Indicators section missing one of Time, Error rate, or Value
6. Publish (§ Publish)

## Publish

When `$ARGUMENTS` carries `--no-publish`, do not publish. Tell the user that `.claude/OUTCOME.md` is left uncommitted and that calling `/outcome` directly opens a PR for it, then stop. Other skills and procedures pass this argument when they call for a stub. Publishing there would switch the branch to `docs/outcome` and mix the caller's changes into that PR. Do not publish when no section changed. Otherwise read ${CLAUDE_SKILL_DIR}/../_lib/publish.md and open a draft PR with the values below.

| Value   | Contents                                                             |
| ------- | -------------------------------------------------------------------- |
| branch  | `docs/outcome`                                                       |
| subject | `[Docs] <title>`, the title saying whether OUTCOME.md was created or updated |
| body    | The names of the changed sections and what they now say              |
| files   | `.claude/OUTCOME.md`                                                 |
