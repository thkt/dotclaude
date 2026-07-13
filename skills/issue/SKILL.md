---
name: issue
description: Generate GitHub Issue with structured title and body. Standalone; requires no upstream stage. When challenge / research / think artifacts exist in the conversation, they feed the body's evidence and the `## Plan` section.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue, prepare for build
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Bash(test:*) Read AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

A standalone issue-creation skill. It requires no upstream stage (challenge / research / think) and never nests them. When their artifacts exist in the conversation context, use them: the challenge verdict for the posting judgment, research findings as the body's evidence, and think's structured plan written out as the `## Plan` section. The human decides which stages an issue goes through.

## Input

`$ARGUMENTS` is the issue description. If empty, prompt for it via AskUserQuestion.

## Language

Read `language` from `~/.claude/settings.json` and translate the issue body and templates into that language. If unset, default to English. Only identifiers, code, commands, and proper nouns stay in English; do not mix loose English words that have a plain equivalent in the configured language into the prose. Template-derived headings and Plan-section extraction keywords stay in English.

## Phase 1: Drafting

1. Read `.claude/OUTCOME.md` if present and check that the issue serves the outcome
2. Detect the type from the description
3. For feature / bug, if the Why (who needs this, what pain exists, what counts as success) is not readable from the description, pin it down through wall-bouncing
4. Select the template, generate the title + body, and mark fixed / tentative per the confidence-marking criteria
5. Assess whether the issue is epic-sized and should split

### Type detection

Default to `feature` if unclear. The title takes a bracketed prefix of the capitalized type.

| Type    | When to use                                             |
| ------- | ------------------------------------------------------- |
| bug     | Something existing is broken or not working as expected |
| feature | New capability or enhancement request                   |
| docs    | Documentation additions or corrections                  |
| chore   | Maintenance, config, or dependency updates              |

### The /fix route for minor bugs

A bug meeting all three criteria below is minor, and handling it directly via /fix without filing is an option. When filing anyway, add a footer note to the body, "minor; may be handled via /fix". An intermittent bug with the root cause unidentified does not qualify.

| Criterion     | Content                                   |
| ------------- | ----------------------------------------- |
| Change extent | Fits within 1 file                        |
| Reproduction  | The reproduction steps are settled        |
| Investigation | No cross-codebase investigation is needed |

### Why wall-bouncing

Establish the issue's Why before drafting the body. One question per message, attaching a hypothesis (the answer you expect) as the recommended option. Questions the codebase can answer are explored via Read / ugrep before asking. Once the three points below are readable from the description, or you can predict the answers to the questions you would ask next, stop asking and move to drafting.

| Question                                    | Where it lands in the body |
| ------------------------------------------- | -------------------------- |
| Who needs this?                             | What & Why                 |
| What pain exists, and what is the evidence? | What & Why                 |
| What measurable result counts as success?   | Acceptance Criteria        |

### Template source

List `.md` files via `gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'`. If a GitHub template matches the type (filename or `name` contains the type), read its body and strip the leading frontmatter (`name` / `about` / `labels` / `title`) for the skeleton; otherwise use `templates/<type>.md` directly under the skill directory.

### Confidence marking

Requirements the user decided stay unmarked. Add an inline `(tentative: <action at pickup>)` only to decisions the user left open and facts not yet verified, and put issue-level premises that attach to no specific line in the Premises section. build extracts tentative marks as assumptions and surfaces them on the draft PR as veto targets the user can overturn. Do not write an uncertain HOW at all.

### Split assessment

When two or more criteria are each independently implementable, ask via AskUserQuestion whether to split, offering "keep as one issue" or "split into an epic and child issues". Do not count fine-grained checks that only verify one deliverable; they stay within one issue. Never auto-split, since publishing N issues is hard to unwind. On approval, publish this issue as the epic and run the rest of the flow unchanged on it.

## Phase 2: Refinement

1. Refine the body inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md` plus the empty-phrase file matching the body language (`phrases.ja.md` for Japanese, `phrases.en.md` for English). After the Plan section is appended in Phase 3, apply the same criteria to it as well
2. If a challenge verdict / findings exist in the conversation, fold only what belongs in the body, once. The verdict and findings themselves never enter the body

## Phase 3: Plan Write-Out

Run this phase only when a structured plan from /think exists in the conversation context; otherwise omit the section entirely.

1. Transfer units / tests / preconditions / test_command into the `## Plan` section following the format and authoring rules in `${CLAUDE_SKILL_DIR}/references/plan-section.md`
2. Verify the existence of the written paths and the line-count rules per plan-section.md § Pre-posting verification
3. Append the `## Backlog candidates` section. List the candidates the plan carved out of scope; write "none" when there are none

## Phase 4: Publishing

1. Present the issue preview. Collect any inline tentative marks into a tentative block (adding no new content, mirroring what the body already carries; omit it at zero items), then confirm via AskUserQuestion: "Create this issue?"
2. Write the body to a temp file, attach labels, and run `gh issue create --title "<title>" --body-file <path>`. Capture the issue URL from its output
3. If split was approved in Phase 1, suggest running /slice with the published epic number. Do not launch it automatically

### Labels

`priority:*` is required, set to critical / high / medium / low by impact. For other labels, follow the repository's conventions.
