---
status: "accepted"
date: "2026-11-19"
decision-makers: thkt
scope: [meta, documentation, skills]
---

# Retire the wiki and scribe and keep intent in code and rules

## Context and Problem Statement

DR-0106 made `docs/wiki/` of `thkt/dotclaude` the fourth document, the place an implementer reads how the work is done today. `/scribe` fills it from closed pull requests, closed Issues, and the reports under `docs/research/`. `/scoping` and `/implement` select pages from it with `skills/scribe/scripts/find_wiki_rule.ts` before they start.

The wiki holds 64 rule pages, a README, and `_candidates.md` with 104 candidates that have one piece of evidence each. The 66 files were first committed in July (9), August (40), and September (17) of 2026. No page was added after September. `scribe.yml` ran 85 times in October and November, and every run ended `success`. One pull request came out of them, #774, and it was closed unmerged. Issue #757, open since 2026-09-24, records four runs that refused tool calls stopped and that still ended `success`. `/scribe` was started in 3 sessions since 2026-10-01.

Removals on 2026-11-18, most of them under DR-0128 and DR-0129, took the repository from 32 skills to 9, from 28 agents to 1, and from 8 workflows to 1. A read of all 64 pages on that day found 9 pages whose subject no longer exists, 9 that restate a rule already in `rules/` or in a `/scoping` reference, 7 whose rule a test already enforces, and 4 that describe a contract the code and its tests state. Claude checked 7 of the 64 rows of that read against the files they name. The other rows are a subagent's reading and were not checked.

Where does the reason behind a piece of code live, and does the wiki stay as a second place that states it?

## Decision Drivers

- thkt holds that intent belongs in the code base: in the code, its tests, and the rules a session loads
- `.claude/OUTCOME.md` asks that quality assurance sit in deterministic layers. A wiki page is prose that nothing runs
- A page is a copy of what the code does. DR-0106 lists as its own cost that the copy is checked for symbol existence only, and that a page drifting in wording reaches an implementation prompt as a quoted precondition
- The generator has produced nothing since September, so the copy no longer follows the code

## Considered Options

- Retire the wiki and scribe, and move a short list (chosen)
- Retire the wiki and scribe, and move every page that has a destination
- Retire scribe and keep the wiki as hand-maintained pages
- Keep both and repair the scribe CI

## Decision Outcome

Chosen option: "Retire the wiki and scribe, and move a short list", because the generator stopped in September, the pages are a copy that nothing checks against the code, and thkt accepts losing the conventions that only a page states in exchange for one place per reason.

`rules/conventions/DOCUMENTS.md` goes back to four documents: `rules/`, `docs/decisions/`, `CLAUDE.md`, and `docs/research/`. The question the wiki answered, "How do I do this today?", is answered by the code, its tests, and the comments that state a reason. Rules 1 to 3 of DOCUMENTS.md § Routing do not concern the wiki. DR-0106 carried them over from DR-0067, and they carry over to this record unchanged.

Three things move.

| From the page | To | Why it moves |
| --- | --- | --- |
| `absence-test-positive-control-fixture` (keep a permanent positive control, write its fixture as a literal, and try a violation whose shape is not on the pattern list) | One row in `rules/development/TESTING.md` § Whether the test swings at nothing | `assertDetectsAndMisses` in `workflows/_lib/tests/_retirement.ts` implements the control, and its comment states the literal rule. A test that does not call the helper, and a test in another repository, read neither |
| `count-comparison-masks-filtered-set-drift` (compare elements, not counts taken after the same filter ran on both sides) | One row in the same table | One of the three comments that cite the page states the reason in full. The other two name the page only, and TESTING.md has no row for this shape |
| `dr-number-collision-check` | A check in `skills/dr/scripts/pre-check.ts` that skips a number an open pull request already uses | `pre-check.ts` returns the highest local number plus one. The collision happened in #491, in #703, and between DR-0128 and DR-0129 |

Four more pages were examined because this week's Issues named them or several comments cite them. They do not move.

| Page | What stays stated without it | What is deleted with it |
| --- | --- | --- |
| `retire-rename-procedure` | The retirement tests scan for leftover names, `HISTORICAL_DIRS` in `_retirement.ts` keeps `docs/decisions/` and `docs/research/` as history, and a README test checks the counts | Measure usage before retiring. Keep the counts in `docs/SKILLS_AGENTS.md` in step. Name in the pull request the detection that is lost and the condition to bring it back. Close the Issues that the retirement voids |
| `deterministic-script-judgment` | `rules/conventions/WORKFLOWS.md` § Relays, for commands a workflow agent relays | The rule that a skill moves a threshold, a cap, an order, or a required set into a script and pins it with a test. Six of the page's seven citations are exclusion lists in retirement tests, not reasons |
| `brittle-test-removal` | `rules/development/TESTING.md` § Whether the test swings at nothing, for the detection | Write in the commit body what the deleted test was meant to guard and why it did not |
| `plugin-version-bump-split` | Nothing | The rule is dropped, see Migration Plan step 4 |

### Consequences

- Good, because a reason is stated once, beside the code it explains, and a test fails when the code stops matching it
- Good, because 109 tracked files go: 66 under `docs/wiki/`, 32 under `skills/scribe/` and its `.ja/` mirror, 10 under `hooks/`, and `scribe.yml`. Four of the 32 move to `/scoping` instead
- Good, because `/scoping` and `/implement` lose a step that selects and pins pages before every run
- Bad, because `find_wiki_rule.ts` ran in 118 session records since 2026-10-01, and that input disappears. Whether a session does worse without it was not measured
- Bad, because the conventions in the right column of the table above are deleted. The four steps of `retire-rename-procedure` were followed in eight Issues during the week of this decision
- Bad, because by the read of 2026-11-18, 34 pages hold a convention that no test can check, and 25 of them have no copy in `rules/`. They are deleted, not moved. Six of them cover closing an Issue, which no skill that stays covers
- Bad, because nothing turns a pattern that repeats across pull requests into a rule any more. A repeated mistake is noticed only when a human sees it
- Bad, because `rules/` is loaded in every repository, so a rule about one repository has no document to go to
- Bad, because the wikis of three other repositories (`recall` with 14 files, `~/.agents` with 6, `~/Personal` with 1) stay on disk and no skill reads them
- Bad, because the 104 candidates in `_candidates.md` are deleted unread. Some record facts about the sandbox and `gh` that no other file holds
- Bad, because DR-0106's Reassessment Triggers name repairs to the wiki (a scan of pages against code), not its removal. This decision rests on thkt's judgment about where intent belongs, and on the generator's standstill

### Confirmation

The removal change adds a retirement test with its own list of scanned paths. It fails when `docs/wiki/`, `skills/scribe/`, `.github/workflows/scribe.yml`, or one of the scribe and wiki hooks exists. It fails when a tracked file outside `docs/decisions/` and `docs/research/` names a page under `docs/wiki/`, the slash command `/scribe`, or `find_wiki_rule`. The scan includes the other retirement tests, which cite wiki pages today, and excludes the synthetic paths in `workflows/_lib/tests/retirement.test.ts`. A test on `pre-check.ts` fails when the script returns a number that an open pull request uses.

## Pros and Cons of the Options

### Retire the wiki and scribe, and move every page that has a destination

Eight pages become new tests and 25 become rows in `rules/` and in skill references.

- Good, because no convention is lost
- Bad, because 25 rows enter files that every session loads, for pages that no code comment cites and no Issue named this week
- Bad, because the eight tests are new work with one incident or none behind six of them

### Retire scribe and keep the wiki as hand-maintained pages

- Good, because the lookup in `/scoping` and `/implement` keeps its input
- Bad, because the pages stop following the code the day the generator goes, and 9 already describe removed code
- Bad, because `find_wiki_rule.ts`, its tests, and the page format checks stay for pages nobody writes

### Keep both and repair the scribe CI

- Good, because repeated patterns keep reaching a document without a human noticing them
- Bad, because the copy stays, and with it the drift DR-0106 names as a cost
- Bad, because Issue #757 has been open since September with the cause of the refused tool calls unknown

## More Information

thkt made the decision on 2026-11-18 and 2026-11-19 in a `/scoping` session. Claude proposed moving seven pages. thkt asked what each one was worth, and the examination reduced them to the three above. The session counts come from the session records under `projects/` of this installation, and the run counts from `gh run list --workflow scribe.yml`.

critic-design returned `weakened` on the first draft. It holds on three corrections made since: the table of pages that do not move states what is deleted, the Migration Plan names the files outside the removed directories, and step 4 follows step 2.

DR-0040 decides an earlier wiki plugin under `plugins/wiki/` that no longer exists. It is not about `docs/wiki/` and this record does not change it.

`docs/research/` stays, with DR-0119. `find-prior-research.ts` moves from `skills/scribe/scripts/` to `skills/scoping/scripts/`, because `/scoping` is its one caller.

### Deprecation Target

| Removed | With its |
| --- | --- |
| `docs/wiki/` | 64 rule pages, `README.md`, `_candidates.md` |
| `skills/scribe/` | `.ja/` mirror, scripts, templates, tests. `find-prior-research.ts`, its `.ja/` mirror, its test, and its fixture move to `skills/scoping/` |
| `.github/workflows/scribe.yml` | Disabled since 2026-11-18 |
| `hooks/pre-bash/wiki_scene.ts`, `hooks/post-bash/scribe_prompt.ts`, `hooks/_lib/scribe_gate.ts`, `hooks/_lib/scribe_trigger.ts` | Their own tests. `settings.json` wires no hook |
| The wiki lookup in `skills/scoping/SKILL.md` Phase 2 and `skills/implement/SKILL.md` Phase 1, and the acceptance of `docs/wiki/` references in `workflows/implement.js` | `.ja/` mirrors and tests |
| The wiki row, Routing rules 4 to 7, and the wiki sentences of § Read and retain in `rules/conventions/DOCUMENTS.md` | `.ja/` mirror |

Files outside those directories change with the removal, because a test in each reads what is removed or a line names it.

| File | What changes |
| --- | --- |
| `tests/table-paragraph.test.ts` | The test that requires a file under `docs/wiki/` |
| `tests/phase-handoff.test.ts` | The three `scribe` entries |
| `hooks/_lib/tests/hooks-toolchain.test.ts` | The removed hooks in the T-014 list |
| `hooks/pre-bash/tests/pre-bash-skill-hooks-retirement.test.ts` | T-327 goes. T-328 stays |
| `skills/implement/tests/workflow-contract.test.js` | The path of `find-prior-research.ts` |
| `workflows/_lib/tests/verifier-retirement.test.ts`, `issue-scripts-retirement.test.ts` | The exclusion of `docs/wiki/deterministic-script-judgment.md` |
| `README.md`, `docs/COMMANDS.md`, `docs/SKILLS_AGENTS.md`, `docs/SPEC.md`, `docs/HOOKS.md`, `docs/AIDLC_V2_MAPPING.md` | The skill count, and the lines that name `/scribe` or the wiki. `.ja/` mirrors too |
| `.claude-plugin/marketplace.json`, `pyrightconfig.json`, `.rumdl.toml` | The plugin description, the include paths, and a comment |

### Migration Plan

1. Add the two rows to `rules/development/TESTING.md`. Rewrite the code comments that cite a wiki page so that each states its reason without the page name. 56 tracked files outside `docs/wiki/`, `docs/decisions/`, `docs/research/`, and `.ja/` name `docs/wiki/`. The two exclusions of `deterministic-script-judgment.md` wait for step 2, because the page still names retired scripts while it exists
2. Remove the files under Deprecation Target and change the files in the second table. In the same change, mark DR-0106 and DR-0116 superseded by this record. DR-0116 decides where `scribe_gate.ts` sits
3. Add the collision check to `pre-check.ts`. It does not depend on steps 1 and 2
4. After step 2 is merged and its CI has passed, remove `version` from the plugin entry of `.claude-plugin/marketplace.json`, `metadata.version` beside it, and the version row of `docs/SPEC.md`. With a version set on the entry, Claude Code keeps an installed plugin on that version until the field changes, and the field has said `4.1.0` since 2026-07-18 while 1993 commits followed. Without it, the version is the commit of the source, so every merge to `main` is what an installer receives (code.claude.com/docs/en/plugins/loading § Versions and updates, read 2026-11-19)
5. Close Issues #757 and #538 as not planned. thkt does this by hand

### Rollback Plan

Each removal is one revert. The wiki as it stood is at commit `f1b9b117`. `find_wiki_rule.ts`, the lookup steps, and `docs/wiki/` come back together, because the lookup fails without pages that declare `globs` and `scenes`.

### Reassessment Triggers

No tool counts these. A person sees them while reviewing a pull request or writing up a stopped run.

- thkt writes the same correction in the review of three pull requests that `/implement` published, and no test, rule, or comment states the rule that would have prevented it
- An `/implement` run stops or is repaired, and a page under `docs/wiki/` at commit `f1b9b117` names the cause. Whoever writes up the stop checks that tree with `git show f1b9b117:docs/wiki/<page>`
- A rule that applies to one repository only has to be written down, and `rules/` cannot hold it without loading it in every repository
- A `/scoping` session reads decision records to learn the contract of a module, because its code and tests do not state it
