/// <reference types="node" />
// Ports hooks/_lib/tests/shebang_test.py's ExecutableShebang / NoStaleShebang /
// SettingsCommandShebang / LibHasNoShebang to the .ts side (DR-0114 / contract in the plan for
// this unit). Each ported check takes its subject (pathspec, or a settings-shaped object) and
// its expected value as arguments instead of the fixed hooks/*.py + SHEBANG pair the python
// version reads from module-level constants, so the same function call scans hooks/'s real .ts
// files and, separately, a positive-control fixture under fixtures/shebang/
// (docs/wiki/absence-test-positive-control-fixture.md) -- proving the check is still alive even
// while zero real .ts hook scripts exist yet.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  executableShebangOffenders,
  libHasShebangOffenders,
  settingsCommandShebangOffenders,
  SHEBANG,
  staleShebangOffenders,
  STALE_SHEBANG,
} from "../shebang_scope.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");
const FIXTURES_DIR = "hooks/_lib/tests/fixtures/shebang";
const FIXTURES_EXCLUDE = ":(exclude)hooks/_lib/tests/fixtures/shebang/**";

// The exact fixture files' contents are the load-bearing part of each positive control (an
// exec-bit .ts with a wrong first line, a file carrying the stale bun line, a _lib-shaped .ts
// carrying any shebang, and a settings-shaped JSON naming a .ts) -- see each fixture file itself
// for what it carries and why.
const EXEC_BIT_FIXTURE_PATHSPEC = "hooks/_lib/tests/fixtures/shebang/exec-bit-wrong-shebang.ts";
const EXEC_BIT_FIXTURE_REL = EXEC_BIT_FIXTURE_PATHSPEC;
const STALE_FIXTURE_PATHSPEC = "hooks/_lib/tests/fixtures/shebang/stale-env-bun.ts";
const STALE_FIXTURE_REL = STALE_FIXTURE_PATHSPEC;
const LIB_FIXTURE_PATHSPEC = "hooks/_lib/tests/fixtures/shebang/_lib/has-shebang.ts";
const LIB_FIXTURE_REL = LIB_FIXTURE_PATHSPEC;

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(REPO, relativePath), "utf8"));
}

test("T-010 every executable tracked .ts under hooks/ opens with the bun shebang, and the same check flags the exec-bit fixture whose first line is wrong", () => {
  const realOffenders = executableShebangOffenders(["hooks/**/*.ts", FIXTURES_EXCLUDE], SHEBANG);
  assert.deepEqual(
    realOffenders,
    [],
    `executable hooks/ .ts files with the wrong shebang: ${realOffenders.join(", ")}`,
  );

  const fixtureOffenders = executableShebangOffenders(EXEC_BIT_FIXTURE_PATHSPEC, SHEBANG);
  assert.deepEqual(
    fixtureOffenders,
    [EXEC_BIT_FIXTURE_REL],
    "the exec-bit positive-control fixture must be flagged as carrying the wrong first line",
  );
});

test("T-011 no tracked file under hooks/ carries a stale #!/usr/bin/env bun line, and the same check flags the fixture that carries one", () => {
  const realOffenders = staleShebangOffenders(["hooks/**", FIXTURES_EXCLUDE], STALE_SHEBANG);
  assert.deepEqual(
    realOffenders,
    [],
    `hooks/ files still carrying #!/usr/bin/env bun: ${realOffenders.join(", ")}`,
  );

  const fixtureOffenders = staleShebangOffenders(STALE_FIXTURE_PATHSPEC, STALE_SHEBANG);
  assert.deepEqual(
    fixtureOffenders,
    [STALE_FIXTURE_REL],
    "the stale-shebang positive-control fixture must be flagged",
  );
});

test("T-012 every .ts settings.json names as a hook command carries the exec bit and the bun shebang, and the same check flags the settings-shaped fixture naming a .ts without them", () => {
  const realSettings = readJson("settings.json");
  const realOffenders = settingsCommandShebangOffenders(realSettings, SHEBANG);
  assert.deepEqual(
    realOffenders,
    [],
    `settings.json-named .ts hooks missing the exec bit or the shebang: ${realOffenders.join(", ")}`,
  );

  const fixtureSettings = readJson(`${FIXTURES_DIR}/settings-shaped.json`);
  const fixtureOffenders = settingsCommandShebangOffenders(fixtureSettings, SHEBANG);
  assert.deepEqual(
    fixtureOffenders,
    ["hooks/notify_bun_example.ts"],
    "the settings-shaped positive-control fixture must flag the .ts it names as a command",
  );
});

test("T-013 no tracked .ts under hooks/_lib/ carries a shebang line, and the same check flags the _lib-shaped fixture that carries one", () => {
  const realOffenders = libHasShebangOffenders(["hooks/_lib/**/*.ts", FIXTURES_EXCLUDE]);
  assert.deepEqual(
    realOffenders,
    [],
    `hooks/_lib/ .ts files carrying a shebang line: ${realOffenders.join(", ")}`,
  );

  const fixtureOffenders = libHasShebangOffenders(LIB_FIXTURE_PATHSPEC);
  assert.deepEqual(
    fixtureOffenders,
    [LIB_FIXTURE_REL],
    "the _lib-shaped positive-control fixture must be flagged as carrying a shebang line",
  );
});
