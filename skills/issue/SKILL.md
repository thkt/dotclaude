---
name: issue
description: Generate GitHub Issue with structured title and body. The receptacle for the refine-with-a-human stage; the premise check and the challenge workflow's GO act as the exit gate, refining the issue to the level the build workflow can consume.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue, refine an issue, prepare for build
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Bash(test:*) Read Task Skill Workflow AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

Generate a GitHub Issue with a structured title and body, verifying drafted claims via premise check and challenge before posting. The refine-with-a-human stage completes here: after the challenge workflow's GO, the research / think workflows run and the plan is written out as a `## Plan` section, finishing an issue the build workflow can extract the plan from as-is.

## Input

`$ARGUMENTS` is the issue description. If empty, prompt for it via AskUserQuestion.

## Language

Read `language` from `${CLAUDE_SKILL_DIR}/../../settings.json` and translate the issue body and templates into that language. If unset, default to English. Keep technical terms, code, and identifiers untranslated.

## Execution

1. Read `.claude/OUTCOME.md`; if absent, generate the stub via `/outcome`
2. If the Why (who needs this, what pain exists, what counts as success) is not readable from the description, pin it down through wall-bouncing via AskUserQuestion (§ Why Wall-Bouncing), feature / bug only
3. Detect type from description (§ Type Detection) and judge whether the skip branch applies (§ Skip Branch)
4. Select the template (§ Template Source)
5. Generate title + body following template; mark fixed/tentative (§ Confidence Marking)
6. Assess whether the issue is epic-sized and should split (§ Split Assessment)
7. Filter drafted claims via premise check (§ Premise Check)
8. Refine body inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md` plus the empty-phrase file matching the body language (`${CLAUDE_SKILL_DIR}/references/phrases.ja.md` for Japanese, `${CLAUDE_SKILL_DIR}/references/phrases.en.md` for English). After the Plan section is appended at step 12, apply the same criteria to it as well
9. Verify premises via the challenge workflow (GO / NO-GO), feature / bug only. On NO-GO, revise the body through wall-bouncing and re-run (§ Adversarial Challenge)
10. Run the research workflow for pre-implementation research (§ Research). When the skip branch applies, skip steps 10-12
11. Generate the structured plan via the think workflow (§ Think)
12. Write the structured plan out into the body as a `## Plan` section, then run the round-trip fidelity check and the precondition existence check (§ Plan Write-Out)
13. Preview issue + tentative items → AskUserQuestion: "Create this issue?"
14. Write the body to a temp file, attach labels, run `gh issue create --body-file`, and capture the issue URL from its output (§ Labels; sandbox-compatible, avoids escaping a long body)
15. If split was approved in step 6, hand the published issue to /slice (§ Split Assessment)

## Why Wall-Bouncing

Establish the issue's Why before drafting the body. Skip for docs / chore. If all three points below are readable from the description, proceed without asking.

| Question                                    | Where it lands in the body |
| ------------------------------------------- | -------------------------- |
| Who needs this?                             | What & Why                 |
| What pain exists, and what is the evidence? | What & Why                 |
| What measurable result counts as success?   | Acceptance Criteria        |

- One question per message, attaching a hypothesis (the answer you expect) as the recommended option. The user only has to correct the hypothesis
- Questions the codebase can answer are explored via Read / ugrep before asking
- Once you can predict the answers to the questions you would ask next, understanding is sufficient. Stop asking and move to drafting

## Type Detection

Default to `feature` if unclear. The title takes a bracketed prefix of the capitalized type.

| Type    | When to use                                             |
| ------- | ------------------------------------------------------- |
| bug     | Something existing is broken or not working as expected |
| feature | New capability or enhancement request                   |
| docs    | Documentation additions or corrections                  |
| chore   | Maintenance, config, or dependency updates              |

## Skip Branch

docs / chore and minor bugs skip research / think / plan write-out (steps 10-12). A qualifying example of a minor bug is a typo fix. A non-qualifying example is an intermittent bug with the root cause unidentified; that case does not skip and runs steps 10-12 as usual. A skipped issue gets a footer note in the body, "minor; may be handled via /fix", keeping the /fix path visible. A bug qualifies as minor only when all three criteria below hold.

| Criterion     | Content                                   |
| ------------- | ----------------------------------------- |
| Change extent | Fits within 1 file                        |
| Reproduction  | The reproduction steps are settled        |
| Investigation | No cross-codebase investigation is needed |

## Template Source

List `.md` files via `gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'`. If a GitHub template matches the type (filename or `name` contains the type), read its body and strip the leading frontmatter (`name` / `about` / `labels` / `title`) for the skeleton; otherwise use `${CLAUDE_SKILL_DIR}/templates/<type>.md`. Whichever becomes the skeleton, the rest of the flow (Confidence Marking → Premise Check → prose review → challenge) runs the same.

## Confidence Marking

Mark which parts of the body are fixed vs tentative, so the implementer can tell a requirement to honor from an undecided judgment or unverified fact.

- A first pass, not a verification pass; settling facts is delegated to Premise Check.
- Mark sparingly, only where it changes implementer action. Marking every line buries the marks that matter and defeats the distinction.
- Tentative marks stay inline at the item they qualify. The Premises section stays reserved for issue-level premises that do not attach to a specific line (design refs, global assumptions).
- At the preview, collect the inline tentative marks plus the Premises into a tentative block, adding no new content and mirroring what the body already carries; omit it when there are zero tentative items.
- The marker word follows the language setting in `${CLAUDE_SKILL_DIR}/../../settings.json` (`仮` under Japanese).

| Origin                                                                                            | State     | Notation           | Action phrase                                         |
| ------------------------------------------------------------------------------------------------- | --------- | ------------------ | ----------------------------------------------------- |
| User decided it, or it is the ask (What & Why, Acceptance Criteria, explicit Scope / Constraints) | fixed     | unmarked           | -                                                     |
| AI-inferred HOW (placement, approach, format), or a decision the user left open                   | tentative | `(tentative: ...)` | "decide at pickup" / "change if a better fit appears" |
| Fact not yet verified (residual Premise Check could not settle)                                   | tentative | `(tentative: ...)` | "recheck at pickup"                                   |

## Split Assessment

When two or more criteria are each independently implementable, ask via AskUserQuestion whether to split, offering "keep as one issue" or "split into an epic + child issues". Do not count fine-grained checks that only verify one deliverable; they stay within one issue. Never auto-split, since publishing N issues is hard to unwind. On approval, publish this issue as the epic and run the rest of the flow from the premise check onward unchanged on it. Once its number is captured, run `Skill("slice", "#<epic-number>")` at step 15.

## Premise Check

Sifts the claims already drafted into the body. Not a discovery phase. No agent spawns inside this check, no cross-codebase audit, no digging beyond the drafted claims themselves. A factual claim resolves into an assertion by default; downgrade to tentative only when it cannot.

| Claim type                           | Action                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Current-code claim                   | Verify with 2-3 targeted Read / ugrep checks; annotate the basis in body ("grep-confirmed")                               |
| Claim still ambiguous after checking | Downgrade to tentative; never assert it as fact                                                                           |
| Claim contradicted by the source     | Rewrite the body to match the source. If the mismatch itself matters, state it under Premises with the verification ask   |
| External design ref                  | Always unverified; the skill cannot judge whether the source is current, so add a link + "confirm latest before starting" |
| Target file list                     | Annotate "candidates as of writing; recheck on pickup"                                                                    |
| Code example in body                 | Annotate as a reference, not the implementation ("reference shape; final form decided at pickup")                         |

## Adversarial Challenge

Run `Workflow({name: "challenge", args: {task: <drafted title + body>}})` only for feature or bug (skip when empty). Passing the same verification the build workflow uses (premise → 2 attacks → verdict + script gate) up front means a GO issue can be handed to build as-is. The returned verdict and findings never enter the issue body; collect them into the preview's challenge block.

| Verdict | Handling                                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GO      | Proceed to preview. If conditions are appended, present them as ephemeral critique; fold only what belongs in the body, once |
| NO-GO   | Enter the wall-bouncing loop (below)                                                                                         |

The NO-GO wall-bouncing loop. Using why and gate (when the script gate downgraded, its rule and detail carry the list of residuals) as material, ask a hypothesis-attached decision via AskUserQuestion per residual, fold the answers into the body, and re-run the challenge workflow. Repeat until GO (at most 3 re-runs). If GO is not reached in 3 runs, or the user chooses "post as-is", present the NO-GO evidence at preview and leave post / drop to the user. Do not game the gate: a revision that merely deletes residuals from the body is not a fix. A residual either becomes a decision or stays in the body under a tentative mark.

## Research

For feature / bug where the skip branch does not apply, run `Workflow({name: "research", args: {question: <research question derived from the issue body>, repo: <target repository>}})` and fold the key results into the body's evidence and think's input. When stopped: unresearchable comes back, wall-bounce each missing item via AskUserQuestion with a hypothesis attached, fold the answers in, and re-run. This wall-bouncing runs at most 2 times. Items still unresolved at the cap stay in the body under a tentative mark, with their handling left to the user.

## Think

Run `Workflow({name: "think", args: {task: <title + body>, research: <research summary>}})` with the research results attached, obtaining the structured plan. When ready=false comes back, settle each blocker via AskUserQuestion with a hypothesis attached and re-run. Settling ready=false runs at most 2 times. Items still not ready at the cap stay in the body under a tentative mark, with how to proceed left to the user.

## Plan Write-Out

Write the structured plan the think workflow returned out into the body as a `## Plan` section in natural language, following the format in `${CLAUDE_SKILL_DIR}/references/plan-section.md`. No machine-only hidden blocks.

1. Write-out. Transfer units / tests / preconditions / test_command into the plan-section.md skeleton
2. Round-trip fidelity check. Re-extract the structure from the written Plan section per the plan-section.md extraction contract and reconcile it against the think plan. The reconciled fields are the unit id set / depends_on / test id set / test name / test_command. On mismatch, rewrite the Plan section. Rewriting runs at most 2 times; if the mismatch persists, present the diff to the user for judgment
3. Precondition existence check. Verify each line of the preconditions subsection, path via `test -f <path>` and anchor via `ugrep -F '<pattern>' <path>`; fix or drop any failing line
4. Append the `## Backlog candidates` section. List the candidates the plan carved out of scope; write "none" when there are none

## Labels

`priority:*` is required, set to critical / high / medium / low by impact. For other labels, follow the repository's conventions.
