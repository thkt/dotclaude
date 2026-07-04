// T-033..T-035: contract test locking workflows/build.js's marker-wrapped validate copy to
// the canonical hooks/veto/lib/plan-validate.mjs. build.js cannot import the canonical
// (its body is wrapped as a workflow AsyncFunction), so the two are kept in lockstep here:
// the build.js copy is extracted between CONTRACT-TEST markers, imported as a module, and
// asserted to return identical errors to the canonical on every shared plans fixture.
//
// Extraction writes the marker-delimited body to a temp .mjs and dynamic-imports it (no eval /
// Function constructor, which the guardrails hook blocks).
//
// Run: node --test hooks/veto/tests/contract-build-port.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { test } from "node:test";
import { validate as canonical } from "../lib/plan-validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const BUILD_JS = join(here, "../../../workflows/build.js");
const FIXTURES = join(here, "fixtures/plans");
const BEGIN = "// CONTRACT-TEST-BEGIN validate";
const END = "// CONTRACT-TEST-END validate";

// Extract the marker-delimited validate body from a source string. Marker absence throws loudly
// rather than silently skipping the contract check.
const extractBody = (source) => {
  const start = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`CONTRACT-TEST markers not found in build.js (start=${start}, end=${end})`);
  }
  return source.slice(start + BEGIN.length, end);
};

// Materialize the extracted body (`const validate = ...`) as an importable module and load it.
const importValidate = async (source, tag) => {
  const body = extractBody(source);
  const dir = mkdtempSync(join(tmpdir(), `contract-${tag}-`));
  const file = join(dir, "extracted.mjs");
  writeFileSync(file, `${body}\nexport { validate };\n`);
  try {
    const mod = await import(pathToFileURL(file).href);
    return mod.validate;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// Only valid-JSON fixtures exercise validate; malformed.json tests the stdin parse boundary,
// which validate never sees, so it is skipped by the parse guard below.
const loadPlans = () =>
  readdirSync(FIXTURES)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const raw = readFileSync(join(FIXTURES, f), "utf8");
      try {
        return [{ name: f, plan: JSON.parse(raw) }];
      } catch {
        return [];
      }
    });

test("T-033 build.js validate returns identical errors to the canonical on every plans fixture", async () => {
  const validate = await importValidate(readFileSync(BUILD_JS, "utf8"), "t033");
  const plans = loadPlans();
  assert.ok(plans.length >= 2, "expected at least the valid + invalid plans fixtures");
  for (const { name, plan } of plans) {
    assert.deepEqual(
      validate(plan),
      canonical(plan),
      `build.js validate diverged from canonical on fixture ${name}`,
    );
  }
});

test("T-034 marker absence makes extraction throw (no silent skip)", () => {
  const stripped = readFileSync(BUILD_JS, "utf8").replaceAll(BEGIN, "").replaceAll(END, "");
  assert.throws(() => extractBody(stripped), /markers not found/);
});

test("T-035 a mutated validate copy is detected as divergence", async () => {
  const source = readFileSync(BUILD_JS, "utf8");
  // Drop the empty-goal rule from the copy; the contract equality must then break on a fixture.
  const mutated = source.replace(/\s*if \(!String\(u\.goal \|\| ""\)\.trim\(\)\).*\n/, "\n");
  assert.notEqual(mutated, source, "mutation precondition: empty-goal rule line must exist");
  const validate = await importValidate(mutated, "t035");
  const diverged = loadPlans().some(({ plan }) => {
    try {
      assert.deepEqual(validate(plan), canonical(plan));
      return false;
    } catch {
      return true;
    }
  });
  assert.ok(diverged, "mutated copy should diverge from canonical on at least one fixture");
});
