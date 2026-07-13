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

Verify drafted claims via premise check and challenge before posting; after the challenge GO, write the plan out as a `## Plan` section via research / think. The refine-with-a-human stage completes here, finishing an issue the build workflow can extract the plan from as-is.

## Input

`$ARGUMENTS` is the issue description. If empty, prompt for it via AskUserQuestion.

## Language

Read `language` from `~/.claude/settings.json` and translate the issue body and templates into that language. If unset, default to English. Only identifiers, code, commands, and proper nouns stay in English; do not mix loose English words that have a plain equivalent in the configured language into the prose. Template-derived headings and Plan-section extraction keywords stay in English.

## Title Discipline

The title is fixed in Phase 1; pass the exact same string to challenge / research / think / `gh issue create`. veto binds the evidence bundle by this title, so any divergence gets the create rejected.

## Residual-Resolution Loop

When a gate or verdict does not pass, ask a hypothesis-attached decision via AskUserQuestion per residual (findings / missing / blockers), fold the answers into the body, and re-run. Each caller sets the cap. At the cap, unresolved residuals stay in the body under a tentative mark with their handling left to the user (unless the caller defines a different terminal action). A residual either becomes a decision or stays in the body under a tentative mark; a revision that merely deletes it from the body to slip past the gate is not a fix.

## Phase 1: Drafting

The criteria and procedures for each step (type detection / skip branch / Why wall-bouncing / template source / split assessment) follow `${CLAUDE_SKILL_DIR}/references/drafting.md`.

1. Read `.claude/OUTCOME.md`; if absent, generate the stub via `/outcome`
2. Detect the type from the description and judge whether the skip branch applies
3. For feature / bug, if the Why (who needs this, what pain exists, what counts as success) is not readable from the description, pin it down through wall-bouncing
4. Select the template, generate the title + body, and mark fixed / tentative per the criteria in `${CLAUDE_SKILL_DIR}/references/tentative-marking.md`
5. Assess whether the issue is epic-sized and should split

## Phase 2: Verification

Run Phases 2-3 only for feature / bug where the skip branch does not apply.

1. Sift the drafted claims per the criteria in `${CLAUDE_SKILL_DIR}/references/premise-check.md`
2. Verify via the source-coverage check that the source's requirements are reflected in the body
3. Refine the body inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md` plus the empty-phrase file matching the body language (`phrases.ja.md` for Japanese, `phrases.en.md` for English). After the Plan section is appended in Phase 3, apply the same criteria to it as well
4. Verify premises via challenge

### Source-Coverage Check

Decompose the requirements of the source (the parent issue, or failing that the conversation that led to filing) and list the elements not reflected in the body. Weigh misses (false negatives) over false alarms (false positives). Each unreflected element goes through the residual-resolution loop (at most 2 times) and becomes one of fold into the body / mark tentative as out-of-scope (mirrored into `## Backlog candidates` in Phase 3) / discard as a false positive.

### Adversarial Challenge

1. Run `Skill("challenge", "<drafted title + body>")`. Make the first line the issue title. The returned verdict and findings never enter the issue body (they are shown in the Phase 4 preview)
2. On GO, proceed to Phase 3. If conditions are appended, present them as ephemeral critique; fold only what belongs in the body, once
3. On NO-GO, enter the residual-resolution loop (at most 3 runs), using why and gate (when the script gate downgraded, its rule / detail carry the list of residuals) as material. If GO is not reached, or the user chooses "post as-is", present the NO-GO evidence at preview and leave post / drop to the user

## Phase 3: Research and Planning

### Research

If the target repo has `docs/wiki/`, read the pages relevant to the issue first and include them in the input to research and think. The wiki verbalizes specs, routine procedures, conventions, and code locations; do not re-investigate or re-explain in the issue what can be quoted from it.

1. Run `Skill("research", "<issue title verbatim>\n\nIntent: <Feature planning for feature, Bug investigation for bug>. <research question derived from the issue body>")` and fold the key results into the body's evidence and think's input. Leading with the verbatim issue title and stating the intent satisfies the condition for research to spawn explorer-feature with the issue title in its prompt
2. Once research completes with its output file saved, run `python3 ${CLAUDE_SKILL_DIR}/../../hooks/veto/veto.py research-gate --title "<issue title verbatim>" --file "<saved research file path>"`. This becomes the veto research evidence; skipping it gets the create rejected with no-research
3. When `stopped: unresearchable` comes back, run the residual-resolution loop over each missing item (at most 2 times)

### Think

1. Run `Skill("think", "<title + body>\n\nResearch: <research summary>")` with the research results attached, obtaining the structured plan. Make the first line the issue title
2. When `ready=false` comes back, run the residual-resolution loop over each blocker (at most 2 times)

### Plan Write-Out

Write the structured plan the think skill returned out into the body as a `## Plan` section in natural language, following the format in `${CLAUDE_SKILL_DIR}/references/plan-section.md`.

1. Transfer units / tests / preconditions / test_command into the plan-section.md skeleton. When a spec or convention is already verbalized in a `docs/wiki/` page, quote the page in the contract prose instead of re-explaining (e.g. "chunk boundaries follow the spec in `docs/wiki/chunker.md`"). Implementers trace to code via the page's target code paths
2. Round-trip fidelity check. Re-extract the structure from the written Plan section per the plan-section.md extraction contract and reconcile it against the think plan. The reconciled fields are the unit id set / depends_on / test id set / test name / test_command. On mismatch, rewrite the Plan section (at most 2 times). If the mismatch persists, present the diff to the user for judgment
3. Verify the existence of the written paths per plan-section.md § Pre-posting verification
4. Append the `## Backlog candidates` section. List the candidates the plan carved out of scope plus the elements the source-coverage check ruled out of scope; write "none" when there are none

## Phase 4: Publishing

1. Present the issue preview. Collect the inline tentative marks plus the Premises into a tentative block (adding no new content, mirroring what the body already carries; omit it at zero items), and show the challenge verdict / findings in the challenge block. Finally confirm via AskUserQuestion: "Create this issue?"
2. Write the body to a temp file, attach labels, and run `gh issue create --title "<the Phase 1 title verbatim>" --body-file <path>`. Capture the issue URL from its output (sandbox-compatible, avoids escaping a long body)
3. If split was approved in Phase 1, hand the published issue to `Skill("slice", "#<epic-number>")`

### Labels

`priority:*` is required, set to critical / high / medium / low by impact. For other labels, follow the repository's conventions.
