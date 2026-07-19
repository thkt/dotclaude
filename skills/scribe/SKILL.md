---
name: scribe
description: Extract recurring patterns from past closed PRs/issues, verify them against the latest code, and propose them to docs/wiki/ via PR.
when_to_use: scribe 実行, wiki 抽出, 共通項の蒸留, PR/issue からの知見蓄積, run scribe, wiki extraction, distill recurring patterns
allowed-tools: Bash(git:*) Bash(gh:*) Read Write Edit LS
---

# /scribe - Accumulate PR / issue recurring patterns into the wiki

Extract the common patterns that recur across this repository's past merged PRs / closed issues, namely routine procedures / conventions and recurring review comments / failure patterns, verify them against the latest code, and accumulate them into `docs/wiki/`. Always propose via PR; the merge is the human approval.

## Invariants

| Condition          | Content                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Via PR             | Never commit or push directly to the default branch                                                |
| Progress record    | Where the previous run stopped reading is shown by the mergedAt of the last merged scribe PR       |
| Threshold of 2     | A pattern with fewer than 2 supporting PRs / issues goes to `docs/wiki/_candidates.md`, not a page |
| Facts only         | Write only facts stated in PRs / issues and facts verified in the current code. No guessing        |
| Worktree isolation | Edit and commit inside an isolated worktree; never touch the user's working tree                   |

## Phase 1: Preconditions and onboarding

1. Check for an unmerged scribe PR with `gh pr list --label scribe --state open --limit 1`. If one exists, do not overtake it; stop and report
2. If `docs/wiki/README.md` does not exist, create it from the template in `${CLAUDE_SKILL_DIR}/templates/readme.md` and include it in the upcoming PR
3. If the scribe label does not exist, create it with `gh label create scribe --description "scribe による wiki 提案"`

## Phase 2: Scope

1. Get the mergedAt of the last merged scribe PR with `gh pr list --label scribe --state merged --limit 1 --json mergedAt -q '.[0].mergedAt'`
2. If no mergedAt comes back, this is the first run. Take all of `gh pr list --state merged --search '-label:scribe'` and `gh issue list --state closed` as the scope
3. If a mergedAt comes back, take the PRs from `gh pr list --state merged --search "-label:scribe merged:><mergedAt>"` and the issues from `gh issue list --state closed --search "closed:><mergedAt>"` as the scope
4. If the scope is empty, report "nothing new" and stop

## Phase 3: Extraction

1. Read `docs/wiki/*.md` and `docs/wiki/_candidates.md` to grasp existing pages / candidates
2. Read each in-scope PR / issue including comments via `gh pr view <number> --comments` / `gh issue view <number> --comments`
3. Triage what you read with this table. Design decisions and their history belong to `docs/decisions/` and are out of scope

| Match                             | Operation                                                      |
| --------------------------------- | -------------------------------------------------------------- |
| Pattern on an existing page       | Append `#number` to its evidence; update content if it changed |
| Second evidence for a candidate   | Promote to a page and remove the candidate line                |
| A recurring sign matching nothing | Append "one-line content + #number" to `_candidates.md`        |
| One-off circumstance              | Do not write                                                   |

## Phase 4: Cross-check against the latest code

Before creating, promoting, or updating a page, cross-check each pattern against the current code. For each item that holds, add the current-code evidence as `path` or `path:line` next to the PR / issue numbers, and list the items dropped by verification in the PR body of `§ Phase 5: PR creation`.

| Check                                                         | When it fails                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Does the convention/procedure still hold in the current code? | Do not write it. If it is on an existing page, update it as no longer holding |
| Is it already mechanically enforced by lint / hook / CI?      | Do not write it; it would duplicate management                                |
| Do the referenced paths/commands still exist?                 | Rewrite with the current paths/commands                                       |

## Phase 5: PR creation

The cap is 3 pages per run, counted as promotions + updates combined; edits to `_candidates.md` do not count. Beyond the cap, prioritize by evidence count and state the leftovers in the PR body. If there is no change at all, do not create a PR. Create a PR even for candidate-only additions.

1. After `git fetch origin <default branch>`, create an isolated worktree and branch `scribe/<yyyymmdd-HHMMSS>` from `origin/<default branch>`
2. Edit `docs/wiki/` inside the worktree following the skeleton in `${CLAUDE_SKILL_DIR}/templates/page.md`, and commit with the message `docs(wiki): <pattern names, ...> を追加/更新`
3. Push and run `gh pr create --base <default branch>`. Title `[scribe] <pattern names, ...> を追加/更新`, label scribe
4. In the body, write the added/promoted/updated pages, candidate additions, the range of PRs / issues read, the items dropped by verification, and any leftovers
5. Remove the worktree
