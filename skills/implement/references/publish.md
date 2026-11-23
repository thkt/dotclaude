# Checks after publication and the switch to ready

The procedure after `launch.ts publish` that Phase 3 of `/implement` uses. `publish` has already done the push, the draft PR creation, the media attachment, the body check, and the publication record. This procedure covers reading the body, the confirmation comment, the CI check, and the switch to ready. CI success alone does not switch the PR to ready. Human approval and merge are not included.

`launch.ts` assembled the PR body from its record. Do not rewrite it by hand. When it is rewritten, `launch.ts` stops with `body-changed` at the next revision. Write what you want to add to the body in the confirmation comment. The attachment that the `media-unattached` row of launch-stops.md describes is the only exception.

## Procedure

1. Read the PR with `gh pr view <n> --json url,state,isDraft,body,headRefOid,baseRefName,closingIssuesReferences`. Confirm that the head is the committed SHA and that the only Issue it closes is this Issue. Check the body's facts, quantities, conditions, scope, negations, and unconfirmed items against the Issue, the last round's reviews in `launch_file`, and the check result (published_body_check).
2. When the body has a `## Media` section, confirm on the PR page that the media displays or plays and that its path matches its content (rendered_media_check). When the page cannot be opened, read the body's HTML. `gh api repos/<repository>/pulls/<n> -H "Accept: application/vnd.github.html+json" --jq .body_html` reads it. Confirm that an image or video exists for each media. Note that the page itself was not checked.
3. Write the confirmation comment to a file. Order its content by the table below. When it is Japanese, run `${CLAUDE_SKILL_DIR}/../../node_modules/.bin/textlint --config ${CLAUDE_SKILL_DIR}/../../.textlintrc.json <file>`. Rewrite each flagged sentence per ${CLAUDE_SKILL_DIR}/../../rules/conventions/PROSE.md. Post it with `gh pr comment <n> --body-file <file>`.
4. Call `gh pr checks <n> --watch --fail-fast` in the background, and wait for the completion notification. Set the timeout at 3600000. When it ends, confirm the following two with `gh pr checks <n> --json name,state,bucket`. Every name in `ciChecks` of `.dotagents.json` is there as a check whose `bucket` is `pass`. No check has `bucket` `fail` or `pending`. When a `ciChecks` name is still missing or `pending` remains, call `--watch` once more. Before and after it, confirm with `gh pr view <n> --json headRefOid` that the head is still the committed SHA.
5. Do the checks noted in Phase 1 that come after publication, and add the results to the PR as a comment.
6. Right before ready, read the PR's head, body, CI on the same head, and the Issue's state again. When any changed from the version confirmed in steps 1 and 4, go back to the step concerned.
7. Switch with `gh pr ready <n>`. Read back with `gh pr view <n> --json isDraft,headRefOid,url` that `isDraft` is false and that the head is the confirmed SHA (mark_ready).

The confirmation comment holds the following content in this order. Leave out a row with nothing to write.

| Order | Content |
| --- | --- |
| 1 | What was checked before and after publication, and the results. Includes the checks the Issue handed over to the AI in charge |
| 2 | The number of `run` calls, the number of rounds, the two reviews' verdicts, and the cost |
| 3 | What the body does not carry. These are the self-review's non-required findings, and the decisions in the implementation session's reply that the Issue does not state |
| 4 | Where it differs from the Issue, defects in the body, and what was not checked. Write them as what you ask a human to check |
| 5 | Remaining work |

## Where each defect goes back to

| Defect | Goes back to |
| --- | --- |
| A defect in the body's description alone | Write it in the confirmation comment. Do not rewrite the body |
| A defect in the deliverable | SKILL.md § Revising an existing PR |
| Missing facts | Investigate. Write the result in the confirmation comment or the Issue |
| A change in requirements or permission | A human decision. Keep the draft and wait |
| A CI failure | Keep the draft. Find the cause in the failed check's log. When the deliverable is the cause, fix it with SKILL.md § Revising an existing PR. When the CI environment is the cause, tell the human |
| An unknown publication result (network failure, interruption) | Do not retry until `gh pr view` confirms the state |
| An unexpected state change by someone else | Check the target, the change, and permission before acting |
