#!/usr/bin/env node
// plan-gate: the deterministic plan-readiness check ported from workflows/build.js:255-293
// (itself a superset of workflows/think.js:114-147). Reads a plan JSON on stdin and returns
// {ready, errors[], normalized_title}. ready is true only when errors is empty. parse failure
// exits 1 (fail-closed). Missing array fields are treated as empty so arbitrary stdin cannot
// crash the gate; content and structural defects surface as errors, not exceptions.
import { validate } from "./lib/plan-validate.mjs";
import { normalizeTitle, readStdin, titleArg } from "./lib/normalize-title.mjs";

const fail = (message) => {
  process.stderr.write(`plan-gate: ${message}\n`);
  process.exit(1);
};

const raw = await readStdin(process.stdin);

let plan;
try {
  plan = JSON.parse(raw);
} catch (e) {
  fail(`stdin is not valid JSON: ${e.message}`);
}
if (plan === null || typeof plan !== "object" || Array.isArray(plan)) {
  fail("stdin is not a JSON object (PLAN_SCHEMA mismatch)");
}

const errors = validate(plan);

process.stdout.write(
  `${JSON.stringify({
    ready: errors.length === 0,
    errors,
    normalized_title: normalizeTitle(titleArg(process.argv)),
  })}\n`,
);
