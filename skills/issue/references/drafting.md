# Drafting Criteria and Procedures

The criteria and procedures each Phase 1 (drafting) step follows. Defines type detection / Why wall-bouncing / template source / split assessment / the /fix route for minor bugs.

## Type detection

Default to `feature` if unclear. The title takes a bracketed prefix of the capitalized type.

| Type    | When to use                                             |
| ------- | ------------------------------------------------------- |
| bug     | Something existing is broken or not working as expected |
| feature | New capability or enhancement request                   |
| docs    | Documentation additions or corrections                  |
| chore   | Maintenance, config, or dependency updates              |

## The /fix route for minor bugs

A bug meeting all three criteria below is minor, and handling it directly via /fix without filing is an option. When filing anyway, add a footer note to the body, "minor; may be handled via /fix", keeping the /fix path visible. A typical example is a typo fix. An intermittent bug with the root cause unidentified does not qualify.

| Criterion     | Content                                   |
| ------------- | ----------------------------------------- |
| Change extent | Fits within 1 file                        |
| Reproduction  | The reproduction steps are settled        |
| Investigation | No cross-codebase investigation is needed |

## Why wall-bouncing

Establish the issue's Why before drafting the body. One question per message, attaching a hypothesis (the answer you expect) as the recommended option. Questions the codebase can answer are explored via Read / ugrep before asking. Once the three points below are readable from the description, or you can predict the answers to the questions you would ask next, stop asking and move to drafting.

| Question                                    | Where it lands in the body |
| ------------------------------------------- | -------------------------- |
| Who needs this?                             | What & Why                 |
| What pain exists, and what is the evidence? | What & Why                 |
| What measurable result counts as success?   | Acceptance Criteria        |

## Template source

List `.md` files via `gh api "repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE" --jq '.[].name'`. If a GitHub template matches the type (filename or `name` contains the type), read its body and strip the leading frontmatter (`name` / `about` / `labels` / `title`) for the skeleton; otherwise use `templates/<type>.md` directly under the skill directory. Whichever becomes the skeleton, the rest of the flow runs the same.

## Split assessment

When two or more criteria are each independently implementable, ask via AskUserQuestion whether to split, offering "keep as one issue" or "split into an epic and child issues". Do not count fine-grained checks that only verify one deliverable; they stay within one issue. Never auto-split, since publishing N issues is hard to unwind. On approval, publish this issue as the epic and run the rest of the flow unchanged on it. Once its number is captured, suggest running /slice in Phase 4.
