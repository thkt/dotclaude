/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SHEBANG, trackedEntries } from "../shebang_scope.ts";
import {
  assertDetectsAndMisses,
  offendersAmong,
  trackedFiles,
} from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

const EXEC_MODE = "100755";

const RETIRED_NAMES = ["git_sandbox_guard.py", "npm_install_guard.py", "rm_to_trash.py"];

function retiredPattern(name: string): RegExp {
  const escaped = name.replace(/\./g, "\\.");
  return new RegExp(`(^|[^\\w.-])${escaped}\\b`);
}

function referencesRetiredPython(content: string): boolean {
  return RETIRED_NAMES.some((name) => retiredPattern(name).test(content));
}

test("T-290 no tracked file outside the historical directories names git_sandbox_guard.py, npm_install_guard.py or rm_to_trash.py as a word, and the same predicate flags a fixture line carrying each", () => {
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
    `files still naming git_sandbox_guard.py, npm_install_guard.py or rm_to_trash.py ` +
      `(docs/decisions/ and docs/research/ are kept as history, not counted)\n${offenders.join(", ")}`,
  );
});

const REPLACEMENTS = [
  "hooks/security/git_sandbox_guard.ts",
  "hooks/security/npm_install_guard.ts",
  "hooks/security/rm_to_trash.ts",
];

test("T-291 the three security hook replacements are tracked .ts files that carry the exec bit and open with the bun shebang", () => {
  for (const relPath of REPLACEMENTS) {
    const [entry] = trackedEntries(relPath);
    assert.ok(entry, `${relPath} is not a tracked file`);
    const [mode] = entry as [string, string];
    assert.equal(mode, EXEC_MODE, `${relPath} is not tracked with the exec bit`);

    const text = readFileSync(join(REPO_ROOT, relPath), "utf8");
    assert.equal(
      text.split(/\r?\n/, 1)[0],
      SHEBANG,
      `${relPath}'s first line is not the bun shebang`,
    );
  }
});
