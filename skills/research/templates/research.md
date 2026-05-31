# Research: <slug>

Generated: YYYY-MM-DD
Session: <session-id>
Intent: Feature planning | Bug investigation | Understanding
Domain: Data model | API | Infrastructure | General
Prior research: <slug of inherited file, or "none found">


## Purpose

<!-- Phase 1 input. 1-2 sentences describing the goal of this research. -->

Investigate ... in order to ...

## Key Findings

<!-- Phase 2-3 outputs after Phase 5 source pass. All findings, sorted by Priority ascending. -->

| Priority | Finding                                       | Source                                             | Next Action              |
| -------- | --------------------------------------------- | -------------------------------------------------- | ------------------------ |
| 1        | Auth handler uses JWT with 24h expiry         | `api/auth.ts:42`                                   | Validate refresh flow    |
| 2        | Token refresh likely lacks rate-limit         | inferred from `middleware/auth.ts:18` (no limiter) | Confirm via load test    |
| 3        | Refresh-token storage backend                 | unknown, requires reading `config/storage.ts`      | Read config next session |
| 4        | Domain entity boundaries (carried from prior) | from `2026-04-15-auth-research.md`, re-verified    | -                        |

## Available Data

<!-- Phase 2 outputs. `Type` is free-text, e.g. File, Tech, Convention, Env, Config. Omit this section if empty. -->

| Type       | Item          | Note                                       |
| ---------- | ------------- | ------------------------------------------ |
| File       | `api/auth.ts` | JWT issue / verify entry point             |
| Tech       | `jose v5.2`   | JWT library, supports key rotation         |
| Convention | error format  | `{ code, message, traceId }` across `api/` |

## Constraints

<!-- Phase 0 inherited + Phase 2 discovered. Omit a row when that category has no constraint. Omit this section when all rows would be empty. -->

| Category    | Constraint                                |
| ----------- | ----------------------------------------- |
| Security    | Tokens must not appear in plain-text logs |
| Performance | Auth handler p95 latency < 50ms           |

## Hypotheses Log

<!-- Phase 3 Strong Inference output. Include this section only when Intent = Bug investigation. Omit otherwise. -->

| # | Hypothesis                              | Discriminating test                   | Result     |
| - | --------------------------------------- | ------------------------------------- | ---------- |
| 1 | Token expiry uses wrong timezone        | grep `Date.now\|UTC` in `auth.ts`     | Eliminated |
| 2 | Middleware skipped on OPTIONS preflight | `curl -X OPTIONS`, check log          | Confirmed  |
| 3 | Race in concurrent refresh              | replay 10 concurrent refresh requests | Eliminated |

## Disconfirmation Check

<!-- Phase 5 output. When Phase 3 ran, write `Covered by Phase 3 elimination`. When Phase 3 was skipped, quote command + raw output from Phase 2 scratch verbatim. Treat 0 hits as possible tool misuse before claiming absence. -->

Command: `ugrep -n 'rateLimit|throttle' middleware/auth.ts tests/auth.test.ts`

Raw output below.

```
(no matches)
```

Result: Not found. Cross-checked with `grep -E 'rateLimit|throttle'` (same) and `yomu search "rate limit auth refresh"` (no hits). Absence confirmed; tests do not cover the concurrent-refresh scenario.

## References

<!-- External docs, issues, and prior research files cited in Findings or Evidence. -->

| Path                                     | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `2026-04-15-auth-research.md`            | Prior research, baseline for inherited findings |
| `https://www.rfc-editor.org/rfc/rfc6749` | OAuth 2.0 spec                                  |
| `github.com/org/repo/issues/1234`        | Tracking issue                                  |

## Coverage Notes

<!-- Phase 5 Coverage check output. List Phase 1 questions noted as unknown and the investigation method to close them. Record tool disagreements found in Phase 2 cross-method verification. Note Phase 4 advisor outcome (or skip reason). -->

- Refresh-token storage backend: noted as unknown in Key Findings. Resolve by reading `config/storage.ts` in next session.
- Tool disagreement (Phase 2): yomu search "ratelimit" returned 2 hits, ugrep returned 0. Investigated: ugrep alternation syntax was wrong. Corrected with `grep -E`.
- Advisor (Phase 4): no missed area flagged. (or: skipped, reason: Phase 0 inherit only, Intent = Understanding, no cross-repo claim)

## Next Steps

| Intent             | Next Command |
| ------------------ | ------------ |
| Feature planning   | `/think`     |
| Bug investigation  | `/fix`       |
| Understanding only | complete     |
