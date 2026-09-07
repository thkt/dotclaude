/// <reference types="node" />
// Tests for hooks/_lib/shebang_scope.ts, the shared bun-shebang / git-discovery module that
// mirrors hooks/_lib/tests/shebang_test.py's SHEBANG / STALE_SHEBANG / EXEC_MODE /
// _tracked_entries for the .ts side (DR-0114).
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { FIXTURES_EXCLUDE, FIXTURES_ROOT, SHEBANG, trackedEntries } from "../shebang_scope.ts";

test("T-009 the bun shebang constant names an absolute interpreter path instead of resolving through env", () => {
  assert.equal(SHEBANG, "#!/opt/homebrew/bin/bun", "DR-0114's single fixed bun path");
  assert.ok(
    !SHEBANG.startsWith("#!/usr/bin/env"),
    `SHEBANG must not resolve the interpreter through env: ${SHEBANG}`,
  );
});

// The exclude token is what keeps the positive-control fixtures out of every real-subject scan,
// so the same pathspec is run with and without it: without, the fixtures are listed (the scan
// reaches them); with, none remain.
test("T-015 the real subject set the discovery returns contains no path under hooks/_lib/tests/fixtures/", () => {
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
