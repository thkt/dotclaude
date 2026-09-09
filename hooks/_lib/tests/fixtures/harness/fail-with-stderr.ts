/// <reference types="node" />
// Positive-control fixture for hook-harness.test.ts's T-240: a "hook" that always fails, so the
// test can see `checked` report the failure rather than swallow it. Not one of the tree's real
// hooks (docs/wiki/absence-test-positive-control-fixture.md) -- no hook here exits non-zero by
// design, so this is the one place a non-zero exit is intentional.
process.stderr.write("boom from fail-with-stderr fixture\n");
process.exit(7);
