# Saving and handing over evidence

Trace the requirements and agreement from the Issue or draft, and keep only reusable evidence in Git-managed documents.

The wiki holds current knowledge, decisions hold important reasons, and research holds originals, following the division in `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md`. Do not add originals alone while leaving the current explanation stale.

Judge whether a report is needed separately from handing over the requirements. Make it traceable from the Issue who agreed on which target and scope, and under what conditions existing evidence can be reused versus the conditions specific to this time. Do not hand over an evaluation not yet run or a proposal as agreed.

## Saving and revising

When the Issue text and source links suffice, do not create a report. When reusable evidence or a long verification result is needed, save or revise it directly in the target repo's docs/research/. Record, as needed, the question, the sources with target version and date checked, the conclusion, the conditions of application, the agreement state, and unconfirmed items. Separate observed facts, agreed rules, and proposals or hypotheses, and refer to existing text where it suffices.

Before saving, check the target checkout, destination, existing content, diff, and sharing scope, and do not overwrite another owner's changes. Revise the existing file for the same investigation. Give a new report a Markdown name that describes its content, and keep README.md as the entry point. Save it as a regular file that Git does not ignore and that does not point elsewhere through a symlink. Do not bring in internal evaluations, whole conversations, secrets, raw logs, or local-only paths.

Review revisions through the Git diff, and check how changes to sources, versions, and conditions of application affect decisions. Check the facts, quantities, conditions, scope, and references of human-facing documents against the originals, and include them in the existing independent evaluation.

## Handing over research results

The sharing owner checks the diff and publication scope, and includes the needed reports in an ordinary change or PR that goes through the target repo's verification and independent evaluation. Refer to existing investigations through committed records, and do not add raw logs in bulk.

Line up the target Issue, the needed reports' repo-relative paths, confirmed Git blob IDs, and start commit, and their save, commit, and sharing state. When no report is needed, state that judgment. When shared, make the report path, commit, and publication target traceable from the Issue; when not shared, show the remaining operations. Do not treat a local save or a commit alone as shared.

Move important decision evidence that lives only in the conversation into the Issue. Select the related wiki pages, decision records, and research originals as needed, and hand over the confirmed versions and their relation to this requirement.

Implementation and independent evaluation refer to the same report version, and judge separately its applicability to the current code and any contradiction. A matching reference alone does not guarantee content, agreement, or sharing state. After updating a report, do not reuse an old evaluation.

`/implement`'s Phase 1 checks the start conditions before implementation. When the confirmed reports are not present at the start commit, the handover is incomplete.

Include the needed reports in a commit within the existing permission. Hold operations that lack permission, and do not add or delete untracked files in bulk. When only publication lacks permission, the permitted implementation can proceed with `/implement`'s `--no-publish`.
