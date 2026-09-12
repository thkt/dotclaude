// workflows/tests/index.js has no reader outside knip.json's entry list (which only keeps
// knip from flagging it unused, never runs it) and enumerates only .test.js, so nothing ever
// executes the .test.ts files it walks past. U-008 requires picking one of two fates for it:
// delete it and drop it from knip.json's entry, or wire it into the CI Node tests step and have
// it enumerate both .test.js and .test.ts. This test accepts either fate and rejects the
// current dead-enumeration middle state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..");
const INDEX_JS = path.join(ROOT, "workflows", "tests", "index.js");
const KNIP_JSON = path.join(ROOT, "knip.json");
const TEST_YML = path.join(ROOT, ".github", "workflows", "test.yml");
const KNIP_ENTRY_NAME = "workflows/tests/index.js";

function readKnipEntry() {
  return JSON.parse(readFileSync(KNIP_JSON, "utf8")).entry;
}

function readNodeTestsStepBody() {
  const workflow = readFileSync(TEST_YML, "utf8");
  const stepStart = workflow.indexOf("- name: Node tests");
  assert.ok(stepStart !== -1, "the Node tests step is missing from .github/workflows/test.yml");
  const nextStep = workflow.indexOf("- name:", stepStart + 1);
  return workflow.slice(stepStart, nextStep === -1 ? undefined : nextStep);
}

test("T-438 either workflows/tests/index.js is absent from the tree and from knip.json, or the CI Node tests step names it and it enumerates both .test.js and .test.ts", () => {
  const indexJsExists = existsSync(INDEX_JS);
  const knipHasEntry = readKnipEntry().includes(KNIP_ENTRY_NAME);
  const absentEverywhere = !indexJsExists && !knipHasEntry;

  const nodeTestsStepBody = readNodeTestsStepBody();
  const ciNamesIt = nodeTestsStepBody.includes(KNIP_ENTRY_NAME);
  const indexJsSource = indexJsExists ? readFileSync(INDEX_JS, "utf8") : "";
  const enumeratesBothExtensions =
    indexJsSource.includes(".test.js") && indexJsSource.includes(".test.ts");
  const usedFromCi = ciNamesIt && enumeratesBothExtensions;

  assert.ok(
    absentEverywhere || usedFromCi,
    `workflows/tests/index.js is neither absent everywhere (exists=${indexJsExists}, ` +
      `knip.json entry has it=${knipHasEntry}) nor used from the CI Node tests step ` +
      `(step names it=${ciNamesIt}, enumerates both .test.js and .test.ts=${enumeratesBothExtensions})`,
  );
});
