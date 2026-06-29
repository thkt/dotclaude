# Verification Procedures

Defines the procedures referenced by /research Phase 4 verification and the Phase 5 sweep.

## Cross-method verification

Apply each trigger structurally; no self-judged exclusion of a finding is allowed. When a finding like "no caller" / "X is the only Y" / "exhaustive list" / "unused in [repo set]" drives downstream PR scope or crosses a repo boundary, verify it with at least 2 of ugrep / bfs, Task(Explore), and targeted Read. On disagreement, flag the discrepancy and identify the tool error before recording. A single-tool zero result is suspect, not authoritative.

## Primary-source verification

Verify external-behavior claims against primary sources.

1. Extract findings whose Source references external behavior not executed this session (hook firing timing, action/parser required schema, library API behavior, cited-paper claims) and is load-bearing (the conclusion, a Next Action, or Disconfirmation depends on the claim being correct)
2. Verify the extracted claims against primary sources in one batch. Use `scout fetch <official docs URL>` for web docs and `scout repo-read` / `scout repo-overview` for sources on GitHub (use-cli-scout is the canonical command reference). When scout is unavailable, fall back to WebFetch / WebSearch
3. When a primary source is unreachable (paywall, no docs, fetch failure), keep the finding but mark it `unverified external claim`, and do not use it as Disconfirmation evidence or a Next Action premise

## Same-origin sweep

After a root cause is confirmed in Bug investigation, sweep the artifacts that share its origin for sibling defects.

1. Locate the commit that introduced the root-cause file (`git log --follow --diff-filter=A`), then enumerate every file in that commit (`git show --stat`)
2. If the commit message or a file header carries a generation marker (`auto-generated from X`, template / deploy notes), add every file originating from X to the sweep
3. For each sibling, identify its consumer (the action / parser / loader that reads it), fetch the consumer's required spec inline (same scout procedure as the primary-source verification above), and check the sibling against it
4. When siblings cross-reference each other's values (a config's keys / block-list vs a form's options), diff the value sets and flag self-defeating alignments (a block-list containing every selectable value, a reference to a value no sibling defines)
5. Record per sibling: pass / same-kind defect / different-kind defect, with evidence
