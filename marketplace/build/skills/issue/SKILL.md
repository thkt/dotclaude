---
name: issue
description: Generate GitHub Issue with structured title and body. The receptacle for the refine-with-a-human stage; the premise check and the challenge skill's GO act as the exit gate, refining the issue to the level the build workflow can consume.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue, refine an issue, prepare for build
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Bash(test:*) Bash(python3:*) Read Task Skill AskUserQuestion
model: opus
argument-hint: "[issue description]"
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "../../hooks/veto/pre-issue-create.sh"
  PostToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "../../hooks/veto/veto.py record bash"
    - matcher: "AskUserQuestion"
      hooks:
        - type: command
          command: "../../hooks/veto/veto.py record skip"
---

# /issue - GitHub Issue Generator

Generate a GitHub Issue with a structured title and body, verifying drafted claims via premise check and challenge before posting. The refine-with-a-human stage completes here: after the challenge GO, research / think run and the plan is written out as a `## Plan` section, finishing an issue the build workflow can extract the plan from as-is.

## Input

`$ARGUMENTS` is the issue description. If empty, prompt for it via AskUserQuestion.

## Language

Read `language` from `~/.claude/settings.json` and translate the issue body and templates into that language. If unset, default to English. Only identifiers, code, commands, and proper nouns stay in English; do not mix loose English words that have a plain equivalent in the configured language into the prose. Template-derived headings and Plan-section extraction keywords stay in English.

## Title Discipline

The title is fixed in Phase 1; pass the exact same string to challenge / research / think / `gh issue create`. veto binds the evidence bundle by this title, so any divergence gets the create rejected.

## Residual-Resolution Loop

When a gate or verdict does not pass, ask a hypothesis-attached decision via AskUserQuestion per residual (findings / missing / blockers), fold the answers into the body, and re-run. Each caller sets the cap and the terminal action when the cap is reached. A residual either becomes a decision or stays in the body under a tentative mark; a revision that merely deletes it from the body to slip past the gate is not a fix.

## Phase 1: Drafting

1. Read `.claude/OUTCOME.md`; if absent, generate the stub via `/outcome`
2. Detect the type from the description and judge whether the skip branch applies
3. For feature / bug, if the Why (who needs this, what pain exists, what counts as success) is not readable from the description, pin it down through wall-bouncing
4. Select the template, generate the title + body, and mark fixed / tentative per the criteria in `${CLAUDE_SKILL_DIR}/references/tentative-marking.md`
5. Assess whether the issue is epic-sized and should split

### Type Detection

Default to `feature` if unclear. The title takes a bracketed prefix of the capitalized type.

| Type    | When to use                                             |
| ------- | ------------------------------------------------------- |
| bug     | Something existing is broken or not working as expected |
| feature | New capability or enhancement request                   |
| docs    | Documentation additions or corrections                  |
| chore   | Maintenance, config, or dependency updates              |

### Skip Branch

docs / chore and minor bugs skip Phases 2-3. Instead, confirm the exemption with the user via an AskUserQuestion with the header `判定スキップ` (options are the detected type). This confirmation becomes the veto skip record, letting a create through without the adversarial flow. A skipped issue gets a footer note in the body, "minor; may be handled via /fix", keeping the /fix path visible. A bug qualifies as minor only when all three criteria below hold. A typical example is a typo fix. An intermittent bug with the root cause unidentified does not qualify; it does not skip and runs Phases 2-3 as usual.

| Criterion     | Content                                   |
| ------------- | ----------------------------------------- |
| Change extent | Fits within 1 file                        |
| Reproduction  | The reproduction steps are settled        |
| Investigation | No cross-codebase investigation is needed |

### Why Wall-Bouncing

Establish the issue's Why before drafting the body. One question per message, attaching a hypothesis (the answer you expect) as the recommended option. Questions the codebase can answer are explored via Read / ugrep before asking. Once the three points below are readable from the description, or you can predict the answers to the questions you would ask next, stop asking and move to drafting.

| Question                                    | Where it lands in the body |
| ------------------------------------------- | -------------------------- |
| Who needs this?                             | What & Why                 |
| What pain exists, and what is the evidence? | What & Why                 |
| What measurable result counts as success?   | Acceptance Criteria        |

### Template Source

List `.md` files via `gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'`. If a GitHub template matches the type (filename or `name` contains the type), read its body and strip the leading frontmatter (`name` / `about` / `labels` / `title`) for the skeleton; otherwise use `${CLAUDE_SKILL_DIR}/templates/<type>.md`. Whichever becomes the skeleton, the rest of the flow runs the same.

### Split Assessment

When two or more criteria are each independently implementable, ask via AskUserQuestion whether to split, offering "keep as one issue" or "split into an epic and child issues". Do not count fine-grained checks that only verify one deliverable; they stay within one issue. Never auto-split, since publishing N issues is hard to unwind. On approval, publish this issue as the epic and run the rest of the flow unchanged on it. Once its number is captured, hand it to /slice in Phase 4.

## Phase 2: Verification

Run Phases 2-3 only for feature / bug where the skip branch does not apply.

1. Sift the drafted claims per the criteria in `${CLAUDE_SKILL_DIR}/references/premise-check.md`
2. Refine the body inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md` plus the empty-phrase file matching the body language (`phrases.ja.md` for Japanese, `phrases.en.md` for English). After the Plan section is appended in Phase 3, apply the same criteria to it as well
3. Verify premises via challenge

### Adversarial Challenge

1. Run `Skill("challenge", "<drafted title + body>")`. Make the first line the issue title so it flows through as the verbatim title into critic spawns and verdict-gate
2. Passing the same verification as the build workflow (premise → 2 attacks → verdict + script gate) up front leaves the GO issue in a state build can consume as-is
3. The returned verdict and findings never enter the issue body; collect them into the preview's challenge block
4. On NO-GO, enter the residual-resolution loop (at most 3 runs), using why and gate (when the script gate downgraded, its rule / detail carry the list of residuals) as material. If GO is not reached, or the user chooses "post as-is", present the NO-GO evidence at preview and leave post / drop to the user

| Verdict | Handling                                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GO      | Proceed to Phase 3. If conditions are appended, present them as ephemeral critique; fold only what belongs in the body, once |
| NO-GO   | Enter the residual-resolution loop (above)                                                                                   |

## Phase 3: Research and Planning

### Research

1. Run `Skill("research", "<issue title verbatim>\n\nIntent: <Feature planning for feature, Bug investigation for bug>. <research question derived from the issue body>")` and fold the key results into the body's evidence and think's input. Leading with the verbatim issue title and stating the intent satisfies the condition for research to spawn explorer-feature with the issue title in its prompt
2. Once research completes with its output file saved, run `python3 ${CLAUDE_SKILL_DIR}/../../hooks/veto/veto.py research-gate --title "<issue title verbatim>" --file "<saved research file path>"`. This becomes the veto research evidence; skipping it gets the create rejected with no-research
3. When stopped: unresearchable comes back, run the residual-resolution loop over each missing item (at most 2 times). Items still unresolved at the cap stay in the body under a tentative mark, with their handling left to the user

### Think

1. Run `Skill("think", "<title + body>\n\nResearch: <research summary>")` with the research results attached, obtaining the structured plan. Make the first line the issue title so think's title flows verbatim into plan-gate
2. When ready=false comes back, run the residual-resolution loop over each blocker (at most 2 times). Items still not ready at the cap stay in the body under a tentative mark, with how to proceed left to the user

### Plan Write-Out

Write the structured plan the think skill returned out into the body as a `## Plan` section in natural language, following the format in `${CLAUDE_SKILL_DIR}/references/plan-section.md`. No machine-only hidden blocks.

1. Transfer units / tests / preconditions / test_command into the plan-section.md skeleton
2. Round-trip fidelity check. Re-extract the structure from the written Plan section per the plan-section.md extraction contract and reconcile it against the think plan. The reconciled fields are the unit id set / depends_on / test id set / test name / test_command. On mismatch, rewrite the Plan section (at most 2 times). If the mismatch persists, present the diff to the user for judgment
3. Verify each line of the preconditions subsection. Path via `test -f <path>`, anchor via `ugrep -F '<pattern>' <path>`. Fix or drop any failing line
4. Append the `## Backlog candidates` section. List the candidates the plan carved out of scope; write "none" when there are none

## Phase 4: Publishing

1. Present the issue preview. Collect the inline tentative marks plus the Premises into a tentative block (adding no new content, mirroring what the body already carries; omit it at zero items), and show the challenge verdict / findings in the challenge block. Finally confirm via AskUserQuestion: "Create this issue?"
2. Write the body to a temp file, attach labels, and run `gh issue create --title "<the Phase 1 title verbatim>" --body-file <path>`. Capture the issue URL from its output (sandbox-compatible, avoids escaping a long body)
3. If split was approved in Phase 1, hand the published issue to `Skill("slice", "#<epic-number>")`

### Labels

`priority:*` is required, set to critical / high / medium / low by impact. For other labels, follow the repository's conventions.
