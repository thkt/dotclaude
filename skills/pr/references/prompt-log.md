# Prompt Log Integration

How `/pr`'s Phase 3 renders, fills, and attaches a prompt log to the PR it just created, and where each failure ends the step early.

## Steps

1. Compute `--since` from the same reflog § Base Branch Detection reads, with `--date=iso`, taking the entry that first moved into the current branch.

   ```bash
   SINCE=$(git reflog --date=iso --format='%gd %gs' | grep "moving from .* to $(git branch --show-current)$" | tail -1 | sed -n 's/^HEAD@{\(.*\)} .*/\1/p')
   ```

2. Run node ${CLAUDE_SKILL_DIR}/scripts/prompt-log.ts `render SESSION_ID --out <path> --since "$SINCE"`. Write the session ID SKILL.md § Prompt Log Integration carries into the command in place of SESSION_ID, since the Bash tool does not export `CLAUDE_SESSION_ID`.
3. Fill each rendered `Outcome:` line with the word matching that prompt (§ Outcome words).
4. Run node ${CLAUDE_SKILL_DIR}/scripts/prompt-log.ts `check <path>`.
5. Report `<path>` on the result line, then confirm the attachment through AskUserQuestion.
6. Branch on the result (§ Result line).

## Outcome words

`check` verifies only that each `Outcome:` line exists and opens with one of these three words. It never verifies that the word chosen is accurate.

| Word        | When to write it                                   |
| ----------- | -------------------------------------------------- |
| `adopted`   | The prompt's request shipped in this PR as asked   |
| `abandoned` | The prompt raised something this PR does not carry |
| `unrelated` | The prompt is not about this PR's change           |

## Result line

| Result                                | What happens                                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `render` or `check` exits non-zero    | End the step. Report the reason its stderr printed and the file path, the same as a failed pageshot attachment (§ Creation Constraints) |
| Both exit 0, AskUserQuestion approves | Run `gh pr edit <number> --attach <path>`                                                                                               |
| Both exit 0, AskUserQuestion declines | End without editing the PR                                                                                                              |
