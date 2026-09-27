---
name: scoping
description: Settle requirements, done conditions, and verification methods, and turn the agreed scope into a GitHub Issue. Do NOT use to implement an agreed Issue (use /implement) or for design exploration that writes a plan (use /think).
when_to_use: 要求整理, 実装範囲の整理, 完了条件, 合意をIssueに, scoping, requirements scoping, sufficiency check
allowed-tools: Read Write Edit LS Agent AskUserQuestion Bash(${CLAUDE_SKILL_DIR}/../scribe/scripts/*) Bash(gh issue:*) Bash(gh api user:*) Bash(gh repo view:*) Bash(git:*) Bash(cat:*) Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[request or issue number]"
---

# /scoping - Settling requirements and implementation scope

Settle the requirements, done conditions, verification methods, and agreed scope, and produce an Issue that hands off to implementation. Product implementation and launching `/implement` are not part of this invocation.

Investigate the facts you can confirm, and ask early about facts only the user knows and about unsettled intent. For a question that needs a human decision, wait for the answer and stop the work that depends on it, while independent investigation continues. The user's explicit instructions take precedence over the skill's general way of proceeding. When an instruction text is the reason to confirm or stop, show the path of the document actually read and the sentence in question, and separate the stated condition from your own interpretation.

## Phase 1: Entry

`$ARGUMENTS` is the request text or an Issue number. When no target repo is named, use the current repository; when there is no original request, ask what the user wants to achieve with AskUserQuestion. Check the named Issue, design proposal, and existing agreement, plus the README and development policy parts relevant this time, and do not re-ask what is already agreed. Small changes and document changes are in scope too. After an interruption or a change of owner, resume from the decisions and gaps in the Issue or draft, checked against the current code and requirements.

## Phase 2: Judgment

1. Per `${CLAUDE_SKILL_DIR}/../../rules/conventions/DOCUMENTS.md` § Read and retain, select the target repo's related wiki pages and decision records. Read the `matched` and `scenes` pages from `${CLAUDE_SKILL_DIR}/../scribe/scripts/find_wiki_rule.ts docs/wiki <request terms> <paths likely touched> --scene plan`. Check the selected pages and records against the current code and agreement. Continue investigating even when no documents exist.
2. Decide what to settle next, and check evidence, alternatives, uncertainty, and permission with the six questions in `${CLAUDE_SKILL_DIR}/references/sufficiency.md`. Investigate the gaps that facts can close.
3. When intent, priority, tolerance, or permission is unsettled, ask through AskUserQuestion with the options and their impact. Put the hypothesis as the first option. Re-evaluate when evidence that drives the decision changes.
4. Consider a small experiment per `${CLAUDE_SKILL_DIR}/references/experiment.md` only when existing material cannot settle it and an observation would change the direction.

## Phase 3: Deliverable

Put the purpose, scope, done conditions, verification methods, agreement, and open items into the Issue or a draft. Only when reusable evidence or a long verification result is needed, save and hand over per `${CLAUDE_SKILL_DIR}/references/session.md`. Once decisions settle, check the effect on wiki pages and decision records per DOCUMENTS.md § Read and retain. When a decision record is needed, use `/dr`'s MADR template.

Check the requirements for gaps, contradictions, and ambiguity, and for agreement with the consensus and evidence. When a contradiction or bias remains, run an independent evaluation with critic-design, and record it as not run when it was not.

With "a proposal only" or "do not publish", stop at a local draft. Use the procedure in `${CLAUDE_SKILL_DIR}/references/issue.md` only when publishing or updating the Issue is within the request, and confirm the target, actor, permission, and the published body and URL. Do not read selecting the skill or saving a draft as permission to publish.

On completion, report the Issue or draft, the agreed scope, the versions and sharing state of the needed reports, and the remaining decisions, and hand over to implementation.
