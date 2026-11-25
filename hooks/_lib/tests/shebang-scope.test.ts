/// <reference types="node" />
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { FIXTURES_EXCLUDE, FIXTURES_ROOT, trackedEntries } from "../shebang_scope.ts";

test("the real subject set the discovery returns contains no path under hooks/_lib/tests/fixtures/", () => {
  const fixturesDir = path.join(FIXTURES_ROOT, path.sep);
  const underFixtures = (entries: Array<[string, string]>) =>
    entries.map(([, absolutePath]) => absolutePath).filter((p) => p.includes(fixturesDir));

  assert.notEqual(
    underFixtures(trackedEntries("hooks/_lib/tests/*")).length,
    0,
    "the pathspec alone reaches the fixtures, so the exclude below has something to remove",
  );
  const offenders = underFixtures(trackedEntries(["hooks/_lib/tests/*", FIXTURES_EXCLUDE]));
  assert.deepEqual(
    offenders,
    [],
    `FIXTURES_EXCLUDE left fixture paths in the subject set: ${offenders.join(", ")}`,
  );
});
