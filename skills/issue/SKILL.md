---
name: issue
description: Generate GitHub Issue with structured title and body. Standalone; requires no upstream stage. When challenge / research / think artifacts exist in the conversation, they feed the body's evidence and the `## Plan` section.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue, prepare for build
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Bash(test:*) Read AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

A standalone issue-creation skill. It requires no upstream stage (challenge / research / think) and never nests them. When their artifacts exist in the conversation context, use them: the challenge verdict as posting-judgment material, research findings as the body's evidence, and think's structured plan written out as the `## Plan` section. Premise verification belongs to /challenge, investigation to /research, design and plan generation to /think, and the human decides which stages an issue goes through.

## Input

`$ARGUMENTS` is the issue description. If empty, prompt for it via AskUserQuestion.

## Language

Read `language` from `~/.claude/settings.json` and translate the issue body and templates into that language. If unset, default to English. Only identifiers, code, commands, and proper nouns stay in English; do not mix loose English words that have a plain equivalent in the configured language into the prose. Template-derived headings and Plan-section extraction keywords stay in English.

## Phase 1: Drafting

The criteria and procedures for each step (type detection / Why wall-bouncing / template source / split assessment / the /fix route for minor bugs) follow `${CLAUDE_SKILL_DIR}/references/drafting.md`.

1. Read `.claude/OUTCOME.md` if present and check that the issue serves the outcome
2. Detect the type from the description
3. For feature / bug, if the Why (who needs this, what pain exists, what counts as success) is not readable from the description, pin it down through wall-bouncing
4. Select the template, generate the title + body, and mark fixed / tentative per the criteria in `${CLAUDE_SKILL_DIR}/references/tentative-marking.md`
5. Assess whether the issue is epic-sized and should split

## Phase 2: Refinement

1. Refine the body inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md` plus the empty-phrase file matching the body language (`phrases.ja.md` for Japanese, `phrases.en.md` for English). After the Plan section is appended in Phase 3, apply the same criteria to it as well
2. If a challenge verdict / findings exist in the conversation, fold only what belongs in the body, once. The verdict and findings themselves never enter the body

## Phase 3: Plan Write-Out

Run this phase only when a structured plan from /think exists in the conversation context; otherwise omit the section entirely. An issue without a Plan is still accepted by build via an ephemeral plan, but plan quality is higher through /think.

1. Transfer units / tests / preconditions / test_command into the `## Plan` section following the format in `${CLAUDE_SKILL_DIR}/references/plan-section.md`. When a spec or convention is already verbalized in a `docs/wiki/` page, quote the page in the contract prose instead of re-explaining (e.g. "chunk boundaries follow the spec in `docs/wiki/chunker.md`")
2. Verify the existence of the written paths per plan-section.md § Pre-posting verification
3. Append the `## Backlog candidates` section. List the candidates the plan carved out of scope; write "none" when there are none

## Phase 4: Publishing

1. Present the issue preview. Collect any inline tentative marks into a tentative block (adding no new content, mirroring what the body already carries; omit it at zero items), then confirm via AskUserQuestion: "Create this issue?"
2. Write the body to a temp file, attach labels, and run `gh issue create --title "<title>" --body-file <path>`. Capture the issue URL from its output (sandbox-compatible, avoids escaping a long body)
3. If split was approved in Phase 1, suggest running /slice with the published epic number. Do not launch it automatically

### Labels

`priority:*` is required, set to critical / high / medium / low by impact. For other labels, follow the repository's conventions.
