# Reflecting into the Issue

Use this when publishing or updating the agreed requirements in an Issue. Do not read saving a draft as permission to publish.

1. Check the target. Read repository, remote, baseBranch, and capture with `cat .dotagents.json`, and compare them against the repo from `gh repo view --json nameWithOwner,defaultBranchRef,viewerPermission`. Also compare the fetch and push URLs from `git remote -v` and the actor from `gh api user --jq .login`, and resolve any mismatch or missing permission. When `.dotagents.json` is absent, leave as an open item that `/implement` will stop. Do not reuse an Issue URL's repo for another repo by keeping only its number.
2. Look for duplicates with `gh issue list --repo OWNER/REPO --state all --search 'related terms'` and the candidate bodies. Read a named Issue with `gh issue view NUMBER --repo OWNER/REPO --json title,body,state,url`. When a duplicate candidate's scope differs, do not merge them.
3. Put the purpose, this task's scope, done conditions, the target repo's own setup, verification method, required media and where they go, and the grounds for agreement into a Markdown draft. Write the required media and where they go to match the `capture` setting, following the table in `${CLAUDE_SKILL_DIR}/../implement/references/capture.md`. Leave the open items and next decision; when deferring an important decision, record the reason, the condition to revisit it, and who decides. Do not mix implementation details or trial management into the requirements, and do not write unagreed items as agreed.
4. Check the draft against the requirements, agreement, and evidence, and resolve gaps, contradictions, and ambiguity. Connect it to the needed independent evaluation and human agreement.
5. Right before publishing, re-check the target and gh's actor and permission. For a new Issue, create it with `gh issue create --repo OWNER/REPO --title 'a title stating the requirement' --body-file PATH`. When updating an existing Issue is within the request, read the latest body, keep the existing requirements and other owners' content, and apply it with `gh issue edit NUMBER --repo OWNER/REPO --body-file PATH`.
6. Read back with `gh issue view NUMBER --repo OWNER/REPO --json title,body,state,url`, and confirm the target repo, body, URL, decisions, agreed scope, evidence, and open items.

When the result is unknown because of a network failure or similar, confirm the actual state on GitHub from the list and the body before retrying. While it cannot be confirmed, do not treat publication as complete; hand over the body, the known state, and the remaining checks. When permission is missing, keep the body and state the needed action.

Fix a gap or mismatch in the body against the requirements, agreement, and evidence, and read it back again. Return a gap that drives the decision to sufficiency.md.

Report the Issue URL and agreed scope, and hand over the report versions, sharing state, and unfinished operations per session.md § Handing over research results. Do not reuse a check made before a change for a report revision or an Issue update.
