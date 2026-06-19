---
name: shake
description: Detect flaky tests by shaking them — repeated runs under varied order, parallelism, and seed — plus a static smell scan that flags latent flakiness in tests that currently pass. Classify each target as confirmed-flaky, latent-flaky, or stable and fix the root cause without weakening the test. Do NOT use to fix a confirmed single bug (use /fix) or for static-only code review (use /audit).
when_to_use: flaky, フレーキー, 不安定なテスト, テストが時々落ちる, 揺れるテスト, intermittent failure, flaky test, テスト不安定, CI が時々赤
allowed-tools: Bash(cargo test:*) Bash(cargo nextest:*) Bash(npm test:*) Bash(npm run:*) Bash(yarn run:*) Bash(pnpm run:*) Bash(bun run:*) Bash(jest:*) Bash(vitest:*) Bash(git diff:*) Bash(git ls-files:*) Bash(ugrep:*) Bash(bfs:*) Read LS Edit AskUserQuestion Skill
model: opus
argument-hint: "[test path or suite; empty = changed tests]"
---

# /shake - Flaky Test Check

Shake the target tests until latent flakiness falls out, then classify and root-cause it. A green test is not assumed stable; it is shaken and smell-scanned before it earns that verdict.

## Input

- `$ARGUMENTS` holds a test path, file, or suite filter.
- Empty `$ARGUMENTS` targets tests touched in the working tree (`git diff --name-only` + `git diff main...HEAD --name-only`, test files only).

### Routing

| `$ARGUMENTS`         | Target set                                        |
| -------------------- | ------------------------------------------------- |
| path / file / filter | That test path or suite                           |
| empty                | Changed test files in the working tree and branch |

## Scope Invariant

A flaky fix changes how a test runs, never what it asserts. Pinning a clock, seeding randomness, isolating state, or mocking I/O is in scope. Loosening an assertion, widening a tolerance, or skipping a case to dodge the flake is out of scope and forbidden (see Anti-gaming).

## Detection

Run both paths. Dynamic shake is the verdict source; static smell explains why and catches green tests that have not deviated yet.

### Dynamic shake

Run the target ≥10 times per dimension. A dimension is the same result 10/10 = no signal from it; 1+ deviation = confirmed-flaky. Vary one dimension at a time so the trigger is attributable.

| Dimension   | What it exposes             | How                                                               |
| ----------- | --------------------------- | ----------------------------------------------------------------- |
| Repeat      | Unseeded randomness, timing | Run the same command ≥10 times                                    |
| Order       | Cross-test shared state     | Randomize test order with a varied seed each run                  |
| Parallelism | Races on shared resources   | Toggle between serial and max-worker execution                    |
| Seed        | Direct PRNG dependence      | Re-run with a different explicit seed where the suite accepts one |

Command flags by ecosystem. Detect from the project manifest.

| Ecosystem         | Serialize               | Randomize order                                | Repeat                        |
| ----------------- | ----------------------- | ---------------------------------------------- | ----------------------------- |
| Rust (nextest)    | `--test-threads=1`      | nextest runs randomized; vary `--test-threads` | shell loop ×10                |
| Rust (cargo test) | `-- --test-threads=1`   | reorder via `--test-threads`                   | shell loop ×10                |
| Jest              | `--runInBand`           | `--shuffle` (seeded)                           | shell loop ×10 or `--shuffle` |
| Vitest            | `--no-file-parallelism` | `--sequence.shuffle`                           | shell loop ×10                |

### Static smell

Scan the target test and its setup with ugrep. Each hit on a currently-passing test is reported as latent-flaky with a fix direction.

| Smell           | Pattern to grep                                                       | Why flaky                          |
| --------------- | --------------------------------------------------------------------- | ---------------------------------- |
| Wall-clock      | `Date.now`, `new Date(`, `Instant::now`, `SystemTime::`, `time.Now`   | Result depends on run instant      |
| Unseeded random | `Math.random`, `thread_rng`, `rand::random`, `faker`                  | Input varies per run               |
| Fixed sleep     | `setTimeout`, `thread::sleep`, `tokio::time::sleep`, `sleep(`         | Races the system under timing load |
| Shared state    | `static mut`, module-level `let`/global, singleton, no per-test reset | Order leaks state between tests    |
| Fixed-path I/O  | `/tmp/<fixed>`, fixed port, real network, env read                    | Collides under parallelism         |

## Classification

| Verdict         | Criteria                                        |
| --------------- | ----------------------------------------------- |
| confirmed-flaky | ≥1 deviating run across any shake dimension     |
| latent-flaky    | 10/10 stable so far, but ≥1 static smell hit    |
| stable          | 10/10 stable across all dimensions and no smell |

## Fix direction

Match the trigger to its root-cause fix. Retries are not a fix.

| Trigger        | Root-cause fix                                                           |
| -------------- | ------------------------------------------------------------------------ |
| Wall-clock     | Inject a clock; fake timers (`jest.useFakeTimers`, `tokio::time::pause`) |
| Random         | Pin the seed; assert on derived invariants, not raw draws                |
| Fixed sleep    | Await the actual condition; fake the clock                               |
| Shared state   | Fresh fixture per test; reset in teardown; remove globals                |
| Order          | Make each test self-contained; keep randomized order on                  |
| Fixed-path I/O | Unique temp dir/port per test; mock the external boundary                |

## Anti-gaming

Forbidden routes to a green suite. These convert a flaky test into a silent gap, which is worse than the flake.

| Forbidden                                         | Instead                                             |
| ------------------------------------------------- | --------------------------------------------------- |
| Delete, skip, or `.only` away the flaky test      | Fix the trigger so it passes under shake            |
| Loosen the assertion or widen a tolerance to pass | Keep the assertion; remove the nondeterminism       |
| Replace a real assertion with an always-pass stub | Assert on a stable derived value                    |
| Add a blanket retry and call it fixed             | Retry only as documented last resort, flagged flaky |
| Edit the shake command or count to force a pass   | Report the residual flake as a blocker              |

## Verification

| Check                                                           | Required                  |
| --------------------------------------------------------------- | ------------------------- |
| Every target test classified                                    | Yes                       |
| confirmed-flaky: root-cause fix applied or deferred with reason | Yes                       |
| latent-flaky: smell + fix direction reported                    | Yes                       |
| Post-fix re-shake ≥10 runs consistent                           | Yes (for each fixed test) |
| Assertions unchanged (Scope Invariant held)                     | Yes                       |

## Stop point

Stop when every target carries a verdict, each confirmed-flaky test is fixed-and-re-shaken or explicitly deferred, and the report lists verdicts, triggers, and fix directions. If a flake survives 3 distinct fix attempts, stop and report it as a blocker rather than retrying or weakening the test.
