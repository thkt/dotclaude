---
status: "superseded by DR-0122"
date: "2026-11-01"
decision-makers: thkt
---

# Narrow the hook trinity to guardrails alone

## Context and Problem Statement

DR-0013 adopted a hook trinity of three Rust binaries: `guardrails` before a write, `formatter` after a write, and a project-wide analyzer. `settings.json` wired four handlers for the latter two plus `assay`, and the set ran on every `Write`, `Edit` and `Bash` call. Two things had gone wrong with that arrangement. `gates` returned a blocking error on `knip` findings from `skills/synced/`, an account-synced cache directory that no edit in this repository can change, and DR-0013's own Decision Outcome placed the analyzer on `PreToolUse(Skill)` while the implementation wired `gates` to `PostToolUse(Write|Edit)` and `PostToolUse(Bash)`. Neither of DR-0013's Reassessment Triggers had fired, so is the trinity worth keeping once its write-time cost is paid on every tool call?

## Decision Drivers

- `gates` returned a blocking error on a finding from a gitignored cache directory, which no edit in this repository can fix
- DR-0013's Decision Outcome and the wiring in `settings.json` had already diverged, so the record described a shape that was not running
- CI already runs `oxlint`, `biome`, `tsc`, `textlint`, `ruff`, `ruff format` and `rumdl` on every push to main and every pull request
- `guardrails` is the only one of the four that runs on `PreToolUse`, so it is the only one that stops a violation before the write lands
- Neither Reassessment Trigger in DR-0013 had fired, so this reopens the decision on a driver DR-0013 did not weigh

## Considered Options

- Narrow the trinity to `guardrails` and leave the rest uncovered (chosen)
- Keep all four and fix the `knip` false positive by adding `skills/synced/**` to `knip.json`'s `ignoreFiles`
- Move the five checks `gates` ran plus `oxfmt --check` into `.github/workflows/test.yml`, keeping coverage and dropping the write-time cost
- Keep `guardrails` and `formatter`, drop `gates` and `assay`

## Decision Outcome

Chosen option: "Narrow the trinity to `guardrails` and leave the rest uncovered", because the decision-maker chose to stop paying the write-time cost and to accept the loss rather than relocate the checks.

`settings.json` now carries 29 hook handlers where it carried 33. The four removed are `assay`, `formatter` and `gates` under `PostToolUse(Write|Edit)`, and `gates changed` under `PostToolUse(Bash)`. `knip` retired with them, since `gates` was its only runner.

The third option was put to the decision-maker for `knip` specifically, as "move it to CI" against "drop it entirely", and dropping it was chosen. The other four checks and `oxfmt --check` were not offered separately and fall under the same choice. This record keeps the option listed because the driver that rejects option 2 does not reject option 3: a CI checkout contains no untracked directory, so the false-positive class cannot occur there.

### Consequences

- Good, because a write can no longer be blocked by a finding outside the repository's own tracked files
- Bad, because nothing checks unused dependencies, circular imports, module coupling or copy-paste duplication any more, and unreferenced exports are checked only for `workflows/_lib/gate.ts` by `workflows/_lib/tests/gate-exports.test.ts`. `.claude/tools.json` had `knip`, `depcruise`, `circular`, `coupling` and `jscpd` enabled in `gates`, and CI runs none of them
- Bad, because nothing formats or format-checks JS and TS at any point. `formatter` ran `oxfmt`, CI has no `oxfmt` step, and `biome.json` sets `formatter.enabled` to false. Drift lands and no step fails
- Bad, because nothing validates the document quality of `spec.md` and `eval-criteria.md`, which `assay` checked for completeness, unambiguity, verifiability and consistency
- Bad, because the five uncovered checks become silent pass-through rather than human review burden. No step reports them, so nobody is prompted to look
- Neutral, because `cargo fmt` and `clippy` still run on `.rs` writes through `rust_post_edit.ts` and `rust_pre_edit.ts`, which never overlapped `formatter`

### Confirmation

`node --test` over the repository's own test globs, plus `npx tsc`, `npx oxlint`, `npx biome lint`, `npx textlint '.ja/**/*.md'` and `rumdl check .`, all of which `.github/workflows/test.yml` runs. The run on `fbb2a998` passed every step. That run confirms nothing broke; it does not confirm the uncovered checks are unnecessary, because no step exercises them.

## Pros and Cons of the Options

### Keep all four and fix the `knip` false positive

Add `skills/synced/**` to `knip.json`'s `ignoreFiles` and leave the wiring alone.

- Good, because the five checks CI does not run stay covered, and write-time JS and TS formatting survives
- Bad, because the cause of the scan is unconfirmed, so an `ignoreFiles` entry is a fix aimed at a symptom. `skills/synced/` has been gitignored since `9445139a` (2026-09-19), long before the incident, and `knip` honours `.gitignore` by default, so the `project` glob reaching the directory does not by itself explain why it was scanned
- Bad, because `skills/**/*.{js,mjs,ts}` is in `knip`'s `project` list, so any future untracked directory under `skills/` carrying JS or TS can repeat it. `skills/synced/` is the only such directory today

### Move the five checks plus `oxfmt --check` into CI

Add steps to `.github/workflows/test.yml` for `knip`, `depcruise`, `circular`, `coupling`, `jscpd` and `oxfmt --check`.

- Good, because a CI checkout carries no untracked directory, so the false-positive class that drove this decision cannot occur there
- Good, because coverage survives at zero per-tool-call cost
- Bad, because findings arrive after a push rather than during the session, and `test.yml` runs on push to main and on pull requests only
- Bad, because it was offered for `knip` and declined. Adopting it for the other checks against that choice would need the decision-maker to reverse it

### Keep `guardrails` and `formatter`, drop `gates` and `assay`

Remove the analyzer and the document-quality check, keep write-time formatting.

- Good, because write-time JS and TS formatting survives, and nothing else covers it
- Bad, because it keeps a second binary on the write path for formatting alone, which the decision-maker chose not to pay for

## More Information

Supersedes DR-0013 (`docs/decisions/0013-adopt-hook-trinity-pattern-with-claude-reviews.md`).

`/challenge` returned NO-GO on this record's first draft. Two `critic-design` passes both returned `weakened`, and four underspecified assumptions remained: whether the uncovered checks became human burden or pass-through, whether the reviewer agents receive the lost checks, whether the Reassessment Triggers can fire, and what actually caused the `skills/synced/` scan. Both passes held that the decision itself can stand and that the fixes were textual. This revision answers all four, and the decision holds under the condition that the uncovered checks are accepted as silent pass-through, which the Consequences now state.

DR-0080 (`docs/decisions/0080-design-workflow-outcome-evaluation-instrument-first.md`) stays accepted, and its chosen instrument-first option does not depend on these hooks. Two of its premises no longer hold: the Decision Driver 「決定論 gate は floor であって measure ではなく、gates/assay/formatter で既に hook 稼働済み」 and Option D 「既存の決定論 gate (gates/assay/formatter) で十分とみなす」. A reader weighing DR-0080's floor against its measure reads this record for what the floor now covers.

DR-0028 and DR-0029 name DR-0013 in their References. Both cite it as the pattern their own decision sits beside, not as a premise, so neither changes here.

Two of the lost checks moved to reviewer agents, and that is a downgrade rather than an absorption. `reviewer-readability` takes unreferenced exports, but `workflows/audit.js` does not route it and `workflows/audit/tests/audit.routing.test.js` lists it in `SKILL_ONLY_REVIEWERS`, so it runs only when someone invokes `use-context-reviewer-readability` by hand. `reviewer-silence` takes the bare shape of an empty catch and a floating promise, and the audit workflow does route it, but a person starts that workflow against a draft PR. A deterministic check that ran on every write is now an optional LLM pass in both cases.

The drift between `settings.json` and the documents is narrowed, not closed. `docs/SPEC.md`'s wiring table and `docs/HOOKS.md`'s event map both still omit handlers that `settings.json` registers, including `pre-bash/client_identifier_gate.ts`, `pre-bash/wiki_scene.ts` and `codegraph prompt-hook`. That remainder is a backlog candidate on issue #769.

Commits: `8bd9d0f4` (the four handlers and the document follow-through), `315ac531` (the `knip` retirement), `fbb2a998` (gitignoring `skills/.trash/`). All three landed on main without a pull request, so no pre-merge CI ran against them.

The binaries stay installed. `brew uninstall gates formatter` and removing `~/.cargo/bin/assay` are unperformed, and `.claude/tools.json` still holds a `gates` key no reader consumes. That file is untracked.

### Deprecation Target

The `assay`, `formatter` and `gates` handlers in `settings.json`, and `knip.json` with the two tests that pinned it (`workflows/tests/knip-scope.test.js`, `workflows/tests/tests-index-fate.test.js`) and the wiki page describing the `knip` block behaviour (`docs/wiki/knip-unused-file-block-pair-consumer.md`).

### Migration Plan

CI carries `oxlint` and `tsc`. Nothing receives the five checks `.claude/tools.json` enabled in `gates`, write-time JS and TS formatting, or the `assay` document check. Each is uncovered rather than moved, and `docs/HOOKS.md`'s Dormant section names them so.

### Rollback Plan

thkt decides, and no date is set. Re-add the four handlers to `settings.json` and restore `knip.json` from `315ac531^`, where it is present at 92 lines along with the two tests and the wiki page. `8bd9d0f4^:settings.json` carries all four handlers. The binaries are still installed, so nothing needs rebuilding. `docs/HOOKS.md` and `docs/SPEC.md` carry the handler tables that would need reverting with them.

### Reassessment Triggers

Three of the five checks below have no detector, which is itself a reason to revisit. The first trigger is the one that supplies the others with evidence.

- A one-off run of `knip`, `depcruise`, `circular`, `coupling` and `jscpd` against the tracked tree reports a finding. Nothing schedules this run, so until someone performs it the remaining triggers have nothing to observe
- A defect reaches a commit that one of those five checks would have caught. This has no detector while nothing runs them, so it is reachable only through the trigger above
- A reviewer run through `use-context-reviewer-readability` or the audit workflow reports an unreferenced export or a silent failure that the retired linters would have caught deterministically
- A `spec.md` or `eval-criteria.md` reaches agreement carrying a defect the `assay` check listed
- `oxfmt --check` gains a CI step, at which point write-time formatting is a latency question rather than a coverage one
- The false positives from untracked directories inside the repository get diagnosed at the source, removing the driver that reopened DR-0013
