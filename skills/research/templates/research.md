# Research: <slug>

Generated: YYYY-MM-DD
Session: <session-id>
Intent: Feature planning | Bug investigation | Understanding
Domain: Data model | API | Infrastructure | General
Prior research: <slug of inherited file, or "none found">

## Purpose

<!-- Phase 2 input. 1-2 sentences describing the goal of this research. -->

Investigate ... in order to ...

## Key Findings

<!-- Phase 3-4 outputs after Phase 6 source pass. All findings, sorted by Priority ascending. -->

| Priority | Finding                                       | Source                                                          | Next Action                  |
| -------- | --------------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| 1        | Auth handler uses JWT with 24h expiry         | `api/auth.ts:42`                                                | Validate refresh flow        |
| 2        | Token refresh likely lacks rate-limit         | inferred from `middleware/auth.ts:18` (no limiter)              | Confirm via load test        |
| 3        | Refresh-token storage backend                 | unknown, requires reading `config/storage.ts`                   | Read config next session     |
| 4        | Domain entity boundaries (carried from prior) | from `2026-04-15-auth-research.md`, re-verified                 | -                            |
| 5        | jose v5 rejects `alg: none` by default        | verified against jose docs via `scout fetch` (quote in scratch) | -                            |
| 6        | Paper claims 40% latency cut with batch issue | unverified external claim (arXiv paywalled)                     | must not premise Next Action |

## Available Data

<!-- Phase 3 outputs. `Type` is free-text, e.g. File, Tech, Convention, Env, Config. Omit this section if empty. -->

| Type       | Item          | Note                                       |
| ---------- | ------------- | ------------------------------------------ |
| File       | `api/auth.ts` | JWT issue / verify entry point             |
| Tech       | `jose v5.2`   | JWT library, supports key rotation         |
| Convention | error format  | `{ code, message, traceId }` across `api/` |

## Constraints

<!-- Phase 1 inherited + Phase 3 discovered. Omit a row when that category has no constraint. Omit this section when all rows would be empty. -->

| Category    | Constraint                                |
| ----------- | ----------------------------------------- |
| Security    | Tokens must not appear in plain-text logs |
| Performance | Auth handler p95 latency < 50ms           |

## Hypotheses Log

<!-- Phase 4 Strong Inference output. Include this section only when Intent = Bug investigation. Omit otherwise. -->

| #   | Hypothesis                              | Discriminating test                   | Result     |
| --- | --------------------------------------- | ------------------------------------- | ---------- |
| 1   | Token expiry uses wrong timezone        | grep `Date.now\|UTC` in `auth.ts`     | Eliminated |
| 2   | Middleware skipped on OPTIONS preflight | `curl -X OPTIONS`, check log          | Confirmed  |
| 3   | Race in concurrent refresh              | replay 10 concurrent refresh requests | Eliminated |

## Same-origin Sweep

<!-- Phase 4 Step 6 output. Include this section only when Intent = Bug investigation and a root cause was confirmed. Omit otherwise. -->

Root-cause file introduced in `3fb3e4c` (commit message: "auto-generated from org/templates"). Swept siblings from `git show --stat 3fb3e4c` plus template-origin files.

| Sibling                  | Consumer (spec source)                      | Result                                          |
| ------------------------ | ------------------------------------------- | ----------------------------------------------- |
| `config/labeler.yml`     | labeler action (spec via `scout repo-read`) | different-kind defect: `label` must be object[] |
| `ISSUE_TEMPLATE/bug.yml` | GitHub Issue Forms (spec via `scout fetch`) | pass                                            |

## Disconfirmation Check

<!-- Phase 6 output. When Phase 4 ran, write `Covered by Phase 4 elimination`. When Phase 4 was skipped, quote command + raw output from Phase 3 scratch verbatim. Treat 0 hits as possible tool misuse before claiming absence. -->

Command: `ugrep -n 'rateLimit|throttle' middleware/auth.ts tests/auth.test.ts`

Raw output below.

```
(no matches)
```

Result: Not found. Cross-checked with `grep -E 'rateLimit|throttle'` (same) and `Task(Explore)` for the auth-refresh path (no hits). Absence confirmed; tests do not cover the concurrent-refresh scenario.

## References

<!-- External docs, issues, and prior research files cited in Findings or Evidence. -->

| Path                                     | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `2026-04-15-auth-research.md`            | Prior research, baseline for inherited findings |
| `https://www.rfc-editor.org/rfc/rfc6749` | OAuth 2.0 spec                                  |
| `github.com/org/repo/issues/1234`        | Tracking issue                                  |

## Coverage Notes

<!-- Phase 6 Coverage check output. List Phase 2 questions noted as unknown and the investigation method to close them. Record tool disagreements found in Phase 3 cross-method verification. Record `unverified external claim` / `unverified (tool unavailable)` findings. Note Phase 5 advisor outcome (or skip reason). -->

- Refresh-token storage backend: noted as unknown in Key Findings. Resolve by reading `config/storage.ts` in next session.
- Tool disagreement (Phase 3): ugrep returned 2 hits for `rateLimit|throttle`, grep returned 0. Investigated: grep BRE needs `\|` for alternation, not `|`. Corrected with `grep -E`.
- Unverified external claim (Finding 6): arXiv paywalled, not used as Disconfirmation evidence or Next Action premise.
- Advisor (Phase 5): no missed area flagged. (or: skipped, reason: Phase 1 inherit only, Intent = Understanding, no cross-repo claim)

## Next Steps

| Intent             | Next Command |
| ------------------ | ------------ |
| Feature planning   | `/think`     |
| Bug investigation  | `/fix`       |
| Understanding only | complete     |
