---
name: issue
description: Generate GitHub Issue with structured title and body. Premise check + critic-design challenge verify drafted claims before posting.
when_to_use: Issue作って, Issue書いて, Issue作成, GitHub Issue
allowed-tools: Bash(gh:*) Bash(cat:*) Bash(ugrep:*) Read Task Skill AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

Generate a GitHub Issue with a structured title and body, verifying drafted claims via premise check and critic-design challenge before posting.

## Input

`$ARGUMENTS` is the issue description. If empty, prompt for it via AskUserQuestion.

## Language

Read `language` from `${CLAUDE_SKILL_DIR}/../../settings.json` and translate the issue body and templates into that language. If unset, default to English. Keep technical terms, code, and identifiers untranslated.

## Execution

1. Read `.claude/OUTCOME.md`; if absent, generate the stub via `/outcome`
2. Detect type from description (§ Type Detection)
3. Select the template (§ Template Source)
4. Generate title + body following template; mark fixed/tentative (§ Confidence Marking)
5. Filter drafted claims via premise check (§ Premise Check)
6. Refine body inline against `${CLAUDE_SKILL_DIR}/references/prose-review.md` plus the empty-phrase file matching the body language (`${CLAUDE_SKILL_DIR}/references/phrases.ja.md` for Japanese, `${CLAUDE_SKILL_DIR}/references/phrases.en.md` for English)
7. Verify premises via `/challenge` (GO / NO-GO), feature / bug only (§ Adversarial Challenge)
8. Preview issue + tentative items → AskUserQuestion: "Create this issue?"
9. Write the body to a temp file, attach labels, and run `gh issue create --body-file` (§ Labels; sandbox-compatible, avoids escaping a long body)
10. Capture issue URL from command output

## Type Detection

Default to `feature` if unclear. The title takes a bracketed prefix of the capitalized type.

| Type    | When to use                                             |
| ------- | ------------------------------------------------------- |
| bug     | Something existing is broken or not working as expected |
| feature | New capability or enhancement request                   |
| docs    | Documentation additions or corrections                  |
| chore   | Maintenance, config, or dependency updates              |

## Template Source

Prefer a repository Issue template; fall back to the skill's bundled template. Detect by listing `.md` files via `gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'`. Whichever becomes the skeleton, the rest of the flow (Confidence Marking → Premise Check → prose review → challenge) runs the same.

| Priority | Condition                                                                 | Template to use                                                                                       |
| -------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1        | A GitHub template matches the type (filename or `name` contains the type) | Read its body; strip the leading frontmatter (`name` / `about` / `labels` / `title`) for the skeleton |
| 2        | No match                                                                  | `${CLAUDE_SKILL_DIR}/templates/<type>.md`                                                             |

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

Run `Skill("challenge", <drafted title + body>)` only for feature or bug (skip when empty). The returned verdict and findings never enter the issue body; collect them into the preview's challenge block. They are review material at confirm time, and the final call to fold or dismiss stays with the user.

| Verdict | Handling                                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GO      | Proceed to preview. If conditions are appended, present them as ephemeral critique; fold only what belongs in the body, once |
| NO-GO   | Present the refuting evidence at preview; leave post / revise / drop to the user                                             |

## Labels

`priority:*` is required, set to critical / high / medium / low by impact. For other labels, follow the repository's conventions.
