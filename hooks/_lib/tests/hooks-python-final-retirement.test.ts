/// <reference types="node" />
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const RETIRED_NAMES = [
  "hook_payload.py",
  "japanese.py",
  "textlint.py",
  "japanese_test.py",
  "shebang_test.py",
];

function retiredPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

function referencesRetiredPython(content: string): boolean {
  return RETIRED_NAMES.some((name) => retiredPattern(name).test(content));
}

test("T-543 no tracked file outside the historical directories names the five retired .py as a word, and the same predicate flags a fixture line carrying each", () => {
  for (const name of RETIRED_NAMES) {
    assertDetectsAndMisses((content) => retiredPattern(name).test(content), name);
  }

  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPython,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming a retired .py (${RETIRED_NAMES.join(", ")}) ` +
      `(docs/decisions/ and docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

function trackedUnderHooks(extension: string): string[] {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--", `hooks/**/*.${extension}`, `hooks/*.${extension}`],
    { cwd: REPO_ROOT, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
}

test("T-544 hooks/ carries no tracked .py file, and the same query reports the .ts files hooks/ does carry", () => {
  assert.deepEqual(trackedUnderHooks("py"), []);

  const typescript = trackedUnderHooks("ts");
  assert.ok(
    typescript.includes("hooks/_lib/command_scan.ts"),
    "the same query no longer finds hooks/_lib/command_scan.ts, so it cannot tell an empty " +
      "hooks/ from a query that stopped working",
  );
});

test("T-545 ruff.toml and pyrightconfig.json name no path under hooks/", () => {
  for (const configPath of ["ruff.toml", "pyrightconfig.json"]) {
    const content = readFileSync(join(REPO_ROOT, configPath), "utf8");
    assert.ok(
      !/["']hooks\//.test(content),
      `${configPath} still names a path under hooks/, which carries no Python to configure`,
    );
  }
});
