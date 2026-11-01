---
status: "accepted"
date: "2026-11-01"
decision-makers: thkt
---

# Leave the quality pipeline binaries entirely unwired

## Context and Problem Statement

DR-0121 narrowed the hook trinity to `guardrails` and kept it on the grounds that it is the only one of the four that runs on `PreToolUse`, so the only one that stops a violation before the write lands. It also recorded a Reassessment Trigger: run `knip`, `depcruise`, `circular`, `coupling` and `jscpd` once against the tracked tree, because the five had no detector once `gates` retired. That run happened the same day, and what it found was smaller than DR-0121 recorded: `depcruise` and `jscpd` were not installed at all, so `gates` had been skipping them fail-open before the retirement; `circular` and `coupling` reported nothing; `knip`'s only finding was the `skills/synced/` false positive that drove DR-0121 in the first place. With the lost layer measured and smaller than written, does the one remaining binary earn its place on every write?

## Decision Drivers

- The measurement shows `gates` was running three checks, not five, and finding nothing but a false positive
- `guardrails` fires on every `Write` and `Edit`, which is the highest-frequency hook position in the harness
- `guardrails` is not idle the way `gates` was: during the session that retired the Python files it blocked one write on two unused imports left by a mid-edit state, and emitted sync-io findings throughout
- CI's own `oxlint` configuration carries `no-unused-vars` and a few override rules. It carries none of the custom rules `guardrails` added
- The decision-maker chose to stop the binary family as a whole rather than keep one member

## Considered Options

- Leave every binary in the family unwired (chosen)
- Keep `guardrails` and act on DR-0121's measurement alone, retiring nothing further
- Move `guardrails`'s custom rules into CI as a separate step, then unwire the hook

## Decision Outcome

Chosen option: "Leave every binary in the family unwired", because the decision-maker chose to stop the family rather than keep its last member, and the measurement removed the ground DR-0121 stood on when it kept one.

`settings.json` now carries 28 hook handlers where DR-0121 left 29. The `gates` binary is uninstalled (`brew uninstall gates`), its plugin cache under `plugins/cache/sentinels/gates/` is gone, and `.claude/tools.json` and `.guardrails.json` are both removed. `guardrails`, `formatter` and `assay` stay installed and unwired.

### Consequences

- Good, because no external binary runs on a write, so a write can no longer be blocked by a tool whose findings the repository cannot act on
- Bad, because the custom rules `guardrails` carried have no replacement anywhere. sensitiveFile, cryptoWeak, XSS and eval were blocking at critical/high severity, and neither CI's `oxlint` nor `biome` enables a security rule
- Bad, because this removes a gate that was demonstrably working. `gates` found nothing across a measured run; `guardrails` blocked a real defect in the session immediately before this decision. The two are not retired on the same evidence
- Bad, because `skills/use-context-reviewer-security`'s taint references describe themselves as complementing the `guardrails` static rules. They are now the only such check, and a reviewer agent runs only when someone invokes it
- Neutral, because `rust_pre_edit.ts` still runs clippy before a `.rs` write, so `.rs` keeps a pre-write gate

### Confirmation

`node --test` over the repository's own test globs, plus `npx tsc`, `npx oxlint`, `npx biome lint`, `npx textlint '.ja/**/*.md'` and `rumdl check .`. `settings.json` carries no `command` naming `guardrails`, `gates`, `formatter` or `assay`, and `docs/HOOKS.md`'s pipeline table records what each one carried rather than describing it as live.

## Pros and Cons of the Options

### Keep `guardrails` and retire nothing further

Act on DR-0121's measurement by leaving the record corrected and the hook in place.

- Good, because the one check with observed value in this harness keeps running
- Good, because the security rules keep a write-time gate that nothing else provides
- Bad, because it leaves the family at one member with no stated rule for when that member goes, which is the shape DR-0121 already drifted from

### Move `guardrails`'s custom rules into CI, then unwire the hook

Add a CI step that runs the same rule set, then remove the hook.

- Good, because the sensitiveFile and XSS coverage survives rather than disappearing
- Good, because a secret committed to a branch fails a check before review rather than after
- Bad, because `guardrails` is a hook-shaped binary that reads a tool payload on stdin, so a CI step would need a different entry point than the one that exists
- Bad, because it was not offered to the decision-maker before the choice was made

## More Information

Supersedes DR-0121 (`docs/decisions/0121-narrow-the-hook-trinity-to-guardrails-alone.md`), which this record replaces one day after it was accepted. DR-0121's own Reassessment Trigger produced the measurement that reopened it, and its Rollback Plan is the one to follow to put any of these back.

The measurement, run with the `gates` binary and `.claude/tools.json` still in place: `command -v depcruise` and `command -v jscpd` both returned nothing, so DR-0013's fail-open skipped them. `circular` and `coupling` are embedded in the binary and reported nothing. `knip` without `knip.json` reports 398 unused files and is unusable; with `knip.json` restored from `315ac531^` its entire output is four unlisted dependencies in `skills/synced/.../pptx/scripts/apply_theme.js`. `gates` prints only failing gates, so the single `✗ knip` line means the rest passed.

That same run settles a point DR-0121 left unconfirmed. With `knip.json` present, `knip` reports findings from the gitignored `skills/synced/`, so the `project` glob reaching that directory is enough for it to be scanned. The internal reason inside `knip` is still unchecked.

Three references to `guardrails` stay in the tree on purpose. `workflows/_lib/run-workflow.ts`, `workflows/adrift.js`, `workflows/assert.js` and `workflows/shake.js` explain code shapes adopted so `guardrails` would not block them, and `.ja/skills/ablate/scripts/usage_counts.ts` names it in a label example. The rules those comments name still exist in the binary, so the explanations hold for the code they sit beside.

`skills/use-context-reviewer-security`'s two taint references and `test/expected.json` still describe `guardrails` as running. Correcting them is a scope decision about what the reviewer now owns, the same shape as `reviewer-readability` and `reviewer-silence` in DR-0121, and is left to its own change.

### Deprecation Target

The `guardrails` handler under `PreToolUse(Write|Edit)` in `settings.json`, the tracked `.guardrails.json`, the untracked `.claude/tools.json`, the `gates` brew formula, and the `plugins/cache/sentinels/gates/` plugin cache.

### Migration Plan

Nothing receives `guardrails`'s custom rules. CI's `oxlint` covers `no-unused-vars` and the override rules it already carried, which is not the same set. `docs/HOOKS.md`'s pipeline table names each retired binary and what it carried, so a reader asking "what used to catch this?" has one place to look.

### Rollback Plan

thkt decides, and no date is set. `brew install thkt/tap/gates` restores the binary; `.guardrails.json` comes back from this change's parent commit and `.claude/tools.json` from `~/.Trash/claude-gates-traces-20261101-155334`. Re-adding the `guardrails` handler to `settings.json` is one object under `PreToolUse(Write|Edit)`, and `docs/HOOKS.md`, `docs/SPEC.md` and `README.md` carry the tables that would revert with it in both trees.

### Reassessment Triggers

- A secret, a weak-crypto call, an XSS sink or an `eval` reaches a commit. `guardrails` blocked these at critical/high, and nothing else looks for them
- An unused import or a similar defect reaches a commit that `guardrails` would have blocked, as it blocked one during the session before this decision
- `skills/use-context-reviewer-security` reports a finding its own references describe as complementing rules that no longer run
- A CI entry point for `guardrails`'s rule set becomes available, which turns the third considered option from unavailable into a choice
- Any binary in this family is wired again, at which point this record stops describing the configuration
