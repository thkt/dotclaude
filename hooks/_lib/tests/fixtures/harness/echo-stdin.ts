/// <reference types="node" />
// Positive-control fixture for hook-harness.test.ts's T-242: writes stdin back to stdout
// byte-for-byte, so the test can see exactly what `checked` put on the wire for an object
// payload (its JSON text) versus a string payload (verbatim).
import { readFileSync } from "node:fs";

process.stdout.write(readFileSync(0, "utf8"));
