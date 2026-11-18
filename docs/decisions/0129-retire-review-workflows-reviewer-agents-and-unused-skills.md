---
status: "accepted"
date: "2026-11-18"
decision-makers: thkt
scope: [meta, skills, workflows, agents]
---

# Retire review workflows, reviewer agents, and unused skills

## Context and Problem Statement

DR-0128 leaves `thkt/dotclaude` one path from a request to a pull request, `/scoping` then `/implement`. Beside that path the repository carries a second body of work: the review workflows (`audit`, `assert`, `polish`), the workflows `shake` and `adrift`, the agents they call, the skills those agents preload, and the skills `/ablate`, `/census`, and `/transcribe`. It is 303 tracked files, 194 on the English side and 109 under `.ja/`.

`workflows/implement.js` reviews the whole diff on its own. Every agent it starts is `general-purpose`, so it calls none of the reviewer, critic, or enhancer agents. Whether the second body stays had to be decided.

## Decision Drivers

- `.claude/OUTCOME.md` asks that quality assurance sit in deterministic layers
- Each file that stays is mirrored under `.ja/`, tested, and read against the conventions on every change to them
- thkt judges that the checks this body performs belong in `thkt/feedback-loop`, as commands a target repository runs, and not in agents that read a diff

## Considered Options

- Retire the review workflows, the agents, and the unused skills (chosen)
- Retire the workflows and keep the agents for direct calls from a session
- Compare the reviewers with `/implement`'s review on one diff first, then decide

## Decision Outcome

Chosen option: "Retire the review workflows, the agents, and the unused skills", because the workflows were launched once since 2026-09-28, `/implement` carries its own review, and thkt moves this kind of check to `thkt/feedback-loop` as deterministic commands.

| Removed | Calls |
| --- | --- |
| `audit` workflow | 0 since 2026-09-28 |
| `assert` workflow | 0 since 2026-09-28 |
| `polish` workflow | 1 since 2026-09-28 |
| `shake` workflow, `adrift` workflow | 0 since 2026-09-28 |
| `/ablate`, `/census`, `/transcribe` | 0 sessions since 2026-10-01 |
| `reviewer-prompt`, called from a session | 47 since 2026-09-28 |
| `reviewer-coverage`, `reviewer-causation`, `reviewer-resilience`, called from a session | 13, 11, 8 |
| `reviewer-design`, `reviewer-security`, `reviewer-readability`, called from a session | 6, 5, 2 |
| The other nine reviewers that stay after DR-0128 | 0 |

### Consequences

- Good, because the repository keeps twelve skills, one workflow, and one agent (`critic-design`, which `/challenge` and `/scoping` call)
- Good, because a diff is reviewed in one place, the review inside `/implement`
- Bad, because no comparison was run. What the removed reviewers find that `/implement`'s review misses is not known
- Bad, because a session can no longer hand a prompt file to `reviewer-prompt`, which it did 47 times in seven weeks. Prompt files are what this repository ships
- Bad, because the lenses with a named standard go: WCAG 2.2 (`reviewer-accessibility`), OWASP Top 10 (`reviewer-security`), Rust and React patterns
- Bad, because five things lose their only tool: flaky-test detection (`shake`), drift between a DR and the code (`adrift`), decisions with no DR (`/census`), reading a spreadsheet (`/transcribe`), and measuring whether a harness element moves a result (`/ablate`)
- Bad, because the reviewer measurement harness goes with the reviewers: the corpora under `skills/use-context-reviewer-*/test/`, `skills/_lib/review_score.ts`, and `skills/_lib/harness_hash.ts`
- Bad, because the decision overrides the DRs listed under Migration Plan while none of their Reassessment Triggers is met. It rests on the usage counts above and on thkt's judgment

### Confirmation

The removal changes extend the retirement test that DR-0128's removal adds under `workflows/_lib/tests/`. It fails when a removed path exists on the English side or under `.ja/`, and when a file under `skills`, `agents`, `rules`, or the plugin manifest names a removed workflow, agent, or skill.

## Pros and Cons of the Options

### Retire the workflows and keep the agents for direct calls from a session

- Good, because `reviewer-prompt` and the six other reviewers a session called stay available
- Bad, because 16 reviewers, their calibration files, and the measurement harness stay for seven that were called
- Bad, because a review a session chooses to start is the discretion the outcome moves away from

### Compare the reviewers with `/implement`'s review on one diff first, then decide

- Good, because the decision would rest on what each review finds
- Bad, because it keeps 303 files until the comparison is designed and run
- Bad, because the result would not change where thkt wants these checks to live

## More Information

thkt made the decision on 2026-11-18. Claude recommended the comparison first, and thkt chose removal without it. The counts come from the session records under `projects/` of this installation.

`/ablate` goes with the reviewers because one of its arms runs a reviewer agent with the skills it preloads (`skills/ablate/scripts/reference_arm.ts` reads `agents/reviewers/` alone). thkt chose to remove the skill over removing that arm. Issue #781, which planned a pilot with `/ablate`, is closed as not planned.

Nothing is moved to `thkt/feedback-loop`. What that repository checks is decided there through `/scoping`. The removed files stay in the history of this repository, and the commit before each removal is named in the pull request that removes them.

### Deprecation Target

| Removed | With its |
| --- | --- |
| `workflows/audit.js`, `workflows/assert.js`, `workflows/polish.js`, `workflows/shake.js`, `workflows/adrift.js` | Directories of the same names, `.ja/` mirrors, tests |
| `agents/reviewers/`, `agents/enhancers/`, `agents/generators/`, `agents/_lib/`, `agents/critics/critic-audit.md`, `agents/critics/critic-evidence.md` | `.ja/` mirrors, calibration files, tests |
| `skills/use-context-reviewer-readability`, `-security`, `-silence`, `-testability`, `skills/use-context-root-cause-analysis`, `skills/use-workflow-tdd-cycle` | `.ja/` mirrors, references, test corpora. Agents preload them, and no agent that stays names one |
| `skills/ablate`, `skills/census`, `skills/transcribe` | `.ja/` mirrors, scripts, references, tests, and the `hucre` dev dependency that `/transcribe` alone uses |
| `skills/_lib/harness_elements.ts`, `python_json.ts`, `review_score.ts`, `harness_hash.ts`, `review-harness.md` | `.ja/` mirrors and tests. Each loses its last user |
| `workflows/_lib/gate.ts` | `.ja/` mirror and tests. `workflows/code.js`, which DR-0128 removes, is its one user |

`agents/critics/critic-design.md` stays. `workflows/_lib/codex-run.ts` and `run-workflow.ts` stay, because `claude-run.ts`, which launches `/implement`, imports both.

### Migration Plan

1. Remove `/ablate`, `/census`, and `/transcribe` first. `/ablate` reads `agents/reviewers/`, so it goes before the agents
2. Remove the five workflows, then the agents and the skills they preload. A workflow calls the agents, so the workflows go first
3. In the change that removes the code a DR governs, mark that DR superseded by this one and rewrite the wiki pages that derive from it. The DRs are DR-0011, DR-0012, DR-0035, DR-0043, DR-0046, DR-0047, DR-0051, DR-0063, DR-0071, DR-0075, DR-0078, DR-0079, DR-0095, DR-0096, DR-0104, and DR-0108
4. Rewrite `rules/conventions/SUBAGENT.md`, `SKILLS.md`, `WORKFLOWS.md`, and `rules/development/TESTING.md` where they describe the removed agents, skills, and the reviewer measurement tier

Six DRs stay, because each decides a rule that outlives the files it was written for. DR-0058 (a skill with one consuming agent is inlined), DR-0081 (fan-out runs in a deterministic workflow, which `implement.js` follows), DR-0100 (root cause by eliminating hypotheses, whose canonical text is `rules/core/OPERATION.md`), DR-0110 (workflow enums in `meta`), and DR-0115 (paths to an agent's bundled assets) lose their examples and keep the rule. DR-0098 decides to retire a mechanism on its usage count, which is the method used here, and it does not depend on the `/census` skill.

### Rollback Plan

Each removal is one revert. The agents and the skills they preload come back together, because an agent names its skills in frontmatter.

### Reassessment Triggers

- A defect of a kind a removed reviewer named (an OWASP Top 10 item, a WCAG 2.2 failure, a swallowed error) reaches `main` through a pull request that `/implement` published
- A prompt file merged through `/implement` breaks a rule of `rules/conventions/` that `reviewer-prompt` checked
- A target repository needs a check that `thkt/feedback-loop` cannot express as a command
- A task needs a spreadsheet read, a flaky test found, or a harness element measured, and it is done by hand twice
