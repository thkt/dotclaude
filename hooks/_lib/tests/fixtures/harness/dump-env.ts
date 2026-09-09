/// <reference types="node" />
// Positive-control fixture for hook-harness.test.ts's T-241: prints the process environment it
// actually received (not the one the test process runs under) so the test can see whether
// `checked`'s env argument replaced it or merely added to it.
process.stdout.write(JSON.stringify(process.env));
