import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const RUNNING_SIDE = /\$HOME\/\.claude\/(settings\.json|history\/)/;
const BUNDLED_DEFINITION = /\$\{rel\}/;

const bareAssetPathsIn = (dir, name) =>
  readFileSync(join(dir, name), "utf8")
    .split("\n")
    .map((text, index) => ({ line: index + 1, text }))
    .filter(({ text }) => text.includes("$HOME/.claude/"))
    .filter(({ text }) => !RUNNING_SIDE.test(text) && !BUNDLED_DEFINITION.test(text))
    .map(({ line, text }) => `${name}:${line} ${text.trim()}`);

test("T-047 the scan reports a fixture script carrying a bare $HOME/.claude asset path, and reports nothing once that path is rewritten through bundled()", () => {
  const dir = mkdtempSync(join(tmpdir(), "reference-notation-fixture-"));
  try {
    const barePathName = "fixture-bare-path.js";
    writeFileSync(
      join(dir, barePathName),
      'const asset = "$HOME/.claude/workflows/fixture/asset.py";\n',
    );
    assert.notDeepEqual(
      bareAssetPathsIn(dir, barePathName),
      [],
      `${barePathName} names a bundled asset by a bare $HOME/.claude path, and the scan should report it`,
    );

    const bundledName = "fixture-bundled.js";
    writeFileSync(
      join(dir, bundledName),
      'const asset = `${bundled("workflows/fixture/asset.py")}`;\n',
    );
    assert.deepEqual(
      bareAssetPathsIn(dir, bundledName),
      [],
      `${bundledName} reaches the asset through bundled(), so the scan should report nothing`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
