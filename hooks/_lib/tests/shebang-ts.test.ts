/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  executableShebangOffenders,
  FIXTURES_EXCLUDE,
  FIXTURES_ROOT,
  libHasShebangOffenders,
  settingsCommandShebangOffenders,
  SHEBANG,
  staleShebangOffenders,
  STALE_SHEBANG,
} from "../shebang_scope.ts";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const EXEC_BIT_FIXTURE = `${FIXTURES_ROOT}/shebang/exec-bit-wrong-shebang.ts`;
const STALE_FIXTURE = `${FIXTURES_ROOT}/shebang/stale-env-bun.ts`;
const LIB_FIXTURE = `${FIXTURES_ROOT}/shebang/_lib/has-shebang.ts`;
const SETTINGS_FIXTURE = `${FIXTURES_ROOT}/shebang/settings-shaped.json`;

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(REPO, relativePath), "utf8"));
}

test("T-010 every executable tracked .ts under hooks/ opens with the bun shebang, and the same check flags the exec-bit fixture whose first line is wrong", () => {
  const realOffenders = executableShebangOffenders(["hooks/*.ts", FIXTURES_EXCLUDE], SHEBANG);
  assert.deepEqual(
    realOffenders,
    [],
    `executable hooks/ .ts files with the wrong shebang: ${realOffenders.join(", ")}`,
  );

  assert.deepEqual(
    executableShebangOffenders(EXEC_BIT_FIXTURE, SHEBANG),
    [EXEC_BIT_FIXTURE],
    "the exec-bit positive-control fixture must be flagged as carrying the wrong first line",
  );
});

test("T-011 no tracked file under hooks/ carries a stale #!/usr/bin/env bun line, and the same check flags the fixture that carries one", () => {
  const realOffenders = staleShebangOffenders(["hooks/*", FIXTURES_EXCLUDE], STALE_SHEBANG);
  assert.deepEqual(
    realOffenders,
    [],
    `hooks/ files still carrying #!/usr/bin/env bun: ${realOffenders.join(", ")}`,
  );

  assert.deepEqual(
    staleShebangOffenders(STALE_FIXTURE, STALE_SHEBANG),
    [STALE_FIXTURE],
    "the stale-shebang positive-control fixture must be flagged",
  );
});

test("T-012 every .ts settings.json names as a hook command carries the exec bit and the bun shebang, and the same check flags the settings-shaped fixture naming a .ts without them", () => {
  const realOffenders = settingsCommandShebangOffenders(readJson("settings.json"), SHEBANG);
  assert.deepEqual(
    realOffenders,
    [],
    `settings.json-named .ts hooks missing the exec bit or the shebang: ${realOffenders.join(", ")}`,
  );

  assert.deepEqual(
    settingsCommandShebangOffenders(readJson(SETTINGS_FIXTURE), SHEBANG),
    [EXEC_BIT_FIXTURE],
    "the settings-shaped positive-control fixture must flag the .ts it names as a command",
  );
});

test("T-013 no tracked .ts under hooks/_lib/ carries a shebang line, and the same check flags the _lib-shaped fixture that carries one", () => {
  const realOffenders = libHasShebangOffenders(["hooks/_lib/*.ts", FIXTURES_EXCLUDE]);
  assert.deepEqual(
    realOffenders,
    [],
    `hooks/_lib/ .ts files carrying a shebang line: ${realOffenders.join(", ")}`,
  );

  assert.deepEqual(
    libHasShebangOffenders(LIB_FIXTURE),
    [LIB_FIXTURE],
    "the _lib-shaped positive-control fixture must be flagged as carrying a shebang line",
  );
});
