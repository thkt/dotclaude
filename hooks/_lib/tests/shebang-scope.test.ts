/// <reference types="node" />
// Tests for hooks/_lib/shebang_scope.ts, the shared bun-shebang / git-discovery module that
// mirrors hooks/_lib/tests/shebang_test.py's SHEBANG / STALE_SHEBANG / EXEC_MODE /
// _tracked_entries for the .ts side (DR-0114). Spawns real git through trackedEntries rather
// than reimplementing include/exclude resolution, the same convention shebang_test.py's
// _tracked_entries and hooks-toolchain.test.ts's listTypeCheckedFiles / listOxlintFiles follow.
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { SHEBANG, trackedEntries } from "../shebang_scope.ts";

test("T-009 the bun shebang constant names an absolute interpreter path instead of resolving through env", () => {
  assert.equal(SHEBANG, "#!/opt/homebrew/bin/bun", "DR-0114's single fixed bun path");
  assert.ok(
    !SHEBANG.startsWith("#!/usr/bin/env"),
    `SHEBANG must not resolve the interpreter through env: ${SHEBANG}`,
  );
});

test("T-015 the real subject set the discovery returns contains no path under hooks/_lib/tests/fixtures/", () => {
  const fixturesSegment = `${path.sep}hooks${path.sep}_lib${path.sep}tests${path.sep}fixtures${path.sep}`;
  const entries = trackedEntries("hooks/_lib/tests/**");
  const offenders = entries
    .map(([, absolutePath]) => absolutePath)
    .filter((absolutePath) => absolutePath.includes(fixturesSegment));
  assert.deepEqual(
    offenders,
    [],
    `discovery must exclude hooks/_lib/tests/fixtures/** by default: ${offenders.join(", ")}`,
  );
});
