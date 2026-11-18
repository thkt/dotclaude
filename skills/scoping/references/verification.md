# Verification Procedures

Defines the procedures referenced by `/scoping`'s Phase 2.

Which one applies is decided by the kind of claim to be written in the Issue. Use Cross-method verification for exhaustiveness claims and Primary-source verification for external-behavior claims, structurally, with no self-judged exclusion of a claim. Verifying library API behavior applies ${CLAUDE_SKILL_DIR}/../../rules/development/SOURCING.md.

## Cross-method verification

Apply each trigger structurally; no self-judged exclusion of a claim is allowed. Apply this verification when a claim to be written in the Issue that asserts exhaustiveness drives downstream PR scope or crosses a repo boundary. The targets are claims like "no caller", "X is the only Y", "exhaustive list", and "unused in [repo set]". Verify each with at least 2 of ugrep, bfs, Agent(Explore), and targeted Read. On disagreement, flag the discrepancy and identify the tool error before recording. A single-tool zero result is suspect, not authoritative.

## Primary-source verification

Verify external-behavior claims against primary sources.

1. Extract the claims to be written in the Issue whose source references external behavior not executed this session. Typical cases are hook firing timing, action / parser required schema, library API behavior, and cited-paper claims. Limit to claims on whose correctness the Issue's scope or done conditions depend
2. Verify the extracted claims against primary sources in one batch. Use `scout fetch <official docs URL>` for web docs and `scout repo-read` / `scout repo-overview` for sources on GitHub (use-cli-scout is the canonical command reference)
3. When a primary source is unreachable, such as paywall, no docs, fetch failure, or scout not being installed, keep the claim but mark it `unverified external claim`, and do not use it as a premise of the Issue's scope or done conditions

A repository's README reflects an unreleased main, so it is not a primary source for what the published version does. Confirm what the published version accepts with `npx <pkg>@latest <cmd> --help` and by running it.

## Reading a zero-result

A zero-result does not separate "it does not exist" from "the query is shaped wrong". Before concluding absence, round-trip the same query against a case that returns non-zero. To claim a filter works, measure it with a value that actually has matches. Measuring with an unused value returns zero and cannot be told apart from the filter failing.

| Query                                      | Another reason it returns zero                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| Multiple words in `gh issue list --search` | It ANDs the words, so one word missing the mark returns zero                        |
| A filter on a label or a field             | No item carries that value. It returns the same zero as a value that does not exist |
| An issue search scoped to a repo           | The issue lives in your own repo, not upstream. Re-query with `--owner <yourself>`  |

## Same-origin sweep

For a requirement that fixes existing code returning a result different from what is required, after the root cause is confirmed, sweep the artifacts that share its origin for sibling defects.

1. Locate the commit that introduced the root-cause file via `git log --follow --diff-filter=A`, then enumerate every file in that commit via `git show --stat`
2. If the commit message or a file header carries a generation marker such as `auto-generated from X` or a template / deploy note, add every file originating from X to the sweep
3. For each sibling, identify the action / parser / loader that reads it as its consumer, fetch the consumer's required spec inline, and check the sibling against it. The scout procedure is the same as the primary-source verification above
4. When siblings cross-reference each other's values (a config's keys / block-list vs a form's options), diff the value sets and flag self-defeating alignments (a block-list containing every selectable value, a reference to a value no sibling defines)
5. Record per sibling: pass / same-kind defect / different-kind defect, with evidence
