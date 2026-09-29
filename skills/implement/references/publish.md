# Post-publication checks and the switch to ready

The implement workflow publishes the draft PR, or rewrites its body when revising, and confirms CI on the same head. This procedure covers what follows, from checking the published body to reading back after `gh pr ready`. CI success alone does not switch the PR to ready. Human approval and merge are not included.

## Procedure

1. Read `ci` and `remaining` from the workflow's return value. `ci.status: passed` means the checks named in `ciChecks` succeeded on the published head and no other registered check was failing or pending.
2. Read the actual body and target with `gh pr view <n> --json <fields>`. The fields are url, state, isDraft, body, author, headRefName, and headRefOid. Also read headRepository, headRepositoryOwner, isCrossRepository, baseRefName, closingIssuesReferences, and statusCheckRollup. Confirm that the head repo is the target repo and the PR does not come from another repo. Check the body's facts, quantities, conditions, scope, negations, unconfirmed items, and links (published_body_check). Check them against the Issue, the accepted evaluation summary, and the check result. Read whether omission or formatting at generation changed the meaning. When `remaining` has `rendered_media_check`, confirm on the PR page that the attached media displays or plays and matches its description and placement.
3. When the body is Japanese, save the latest body to a file and run `${CLAUDE_SKILL_DIR}/../../node_modules/.bin/textlint --config ${CLAUDE_SKILL_DIR}/../../.textlintrc.json <file>`. Rewrite each flagged sentence per `${CLAUDE_SKILL_DIR}/../../rules/conventions/PROSE.md`, and compare the rewrite against the Issue and the evidence so that no unconfirmed item turns into a confirmed one. Then continue with the fix below. Do not rewrite the accepted evaluation or the stored evidence.
4. When the body needs a fix, confirm `isDraft: true`, update with `gh pr edit <n> --body-file <path>`, and read back the latest body. Right before writing, check the proposed change against the latest body and head; when someone else changed them, do not overwrite, and ask the user how to incorporate it.
5. Right before ready, re-check the confirmed version against the latest target, body, head, Issue, evaluation summary, and check result, the effective actor from `gh api user`, the permission on the target repo, and CI on the same head. When anything changed, go back to the step concerned.
6. When everything is in place, switch with `gh pr ready <n>`. Read back with `gh pr view <n> --json isDraft,headRefOid,url,body,statusCheckRollup` that `isDraft` is false and the head, body, and CI on the same head match the confirmed version (mark_ready). Return the PR URL, the confirmed version and results, and unconfirmed items.

## Where each defect goes back to

| Defect                                                        | Goes back to                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| A defect in the description alone                             | The body fix and re-check in step 4                                 |
| A defect in the deliverable                                   | SKILL.md § Revising an existing PR                                  |
| Missing facts                                                 | Investigation. Reflect the result in the body or Issue, then step 2 |
| A change in requirements or permission                        | A human decision. Keep the draft and wait                           |
| An unknown publication result (network failure, interruption) | Do not retry until `gh pr view` confirms the actual state           |
| An unexpected state change by someone else                    | Check the target, the change, and permission before acting          |
