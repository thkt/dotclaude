/// <reference types="node" />
// Positive-control fixture for hook-harness.test.ts: a "hook" that always fails, so the
// test can see `checked` report the failure rather than swallow it. Not one of the tree's real
// hooks (rules/development/TESTING.md § Whether the test swings at nothing) -- no hook here exits non-zero by
// design, so this is the one place a non-zero exit is intentional.
process.stderr.write("boom from fail-with-stderr fixture\n");
process.exit(7);
