#!/usr/bin/env node
// verdict-gate: the deterministic residual gate ported from workflows/challenge.js:151-177.
// Reads a {verdict, assumptions[]} JSON on stdin and applies the one-way GO -> NO-GO downgrade.
// The script never upgrades NO-GO to GO. parse / schema failures exit 1 (fail-closed) so no
// GO output can leak from a malformed input.
import { createHash } from "node:crypto";
import { normalizeTitle, readStdin, titleArg } from "./lib/normalize-title.mjs";

const GATE_MAX_ASSUMPTIONS = 7;

const fail = (message) => {
  process.stderr.write(`verdict-gate: ${message}\n`);
  process.exit(1);
};

const raw = await readStdin(process.stdin);

let input;
try {
  input = JSON.parse(raw);
} catch (e) {
  fail(`stdin is not valid JSON: ${e.message}`);
}
if (input === null || typeof input !== "object" || Array.isArray(input)) {
  fail("stdin is not a JSON object (VERDICT_SCHEMA mismatch)");
}
if (input.verdict !== "GO" && input.verdict !== "NO-GO") {
  fail("verdict field missing or not one of GO / NO-GO (VERDICT_SCHEMA mismatch)");
}

const assumptions = Array.isArray(input.assumptions) ? input.assumptions : [];

// Downgrade rules apply only to a GO. NO-GO is never upgraded.
const reasons = [];
if (input.verdict === "GO") {
  if (assumptions.some((a) => a && a.irreversible === true))
    reasons.push("irreversible-assumption");
  if (assumptions.length > GATE_MAX_ASSUMPTIONS) reasons.push("max-assumptions");
  if (assumptions.some((a) => a && a.underspecified === true)) reasons.push("underspecified");
}

const downgraded = reasons.length > 0;
const verdict = downgraded ? "NO-GO" : input.verdict;

process.stdout.write(
  `${JSON.stringify({
    verdict,
    downgraded,
    reasons,
    normalized_title: normalizeTitle(titleArg(process.argv)),
    raw_input_sha: createHash("sha256").update(raw).digest("hex"),
  })}\n`,
);
