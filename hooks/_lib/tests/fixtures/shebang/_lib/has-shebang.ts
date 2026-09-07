#!/opt/homebrew/bin/bun
// Positive-control fixture for hooks/_lib/tests/shebang-ts.test.ts's T-013: sits in a `_lib`-
// shaped directory and carries a shebang line at all (correct or not), which
// LibHasNoShebang.test_T_004's ported check forbids for anything under hooks/_lib/
// (docs/wiki/absence-test-positive-control-fixture.md).
export {};
