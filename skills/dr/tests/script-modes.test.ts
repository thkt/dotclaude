/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");

const CLI_SCRIPT_NAMES = ["pre-check", "validate-dr", "update-index"];
const CLI_SHEBANG = "#!/usr/bin/env node";
const CLI_MODE = "100755";
const LIB_MODE = "100644";

test("the three CLI .ts files in EN and .ja are tracked with mode 100755 and open with #!/usr/bin/env node, and dr_common.ts is tracked with mode 100644 without a shebang", () => {
  const scriptsDirs = ["skills/dr/scripts", ".ja/skills/dr/scripts"];
  const entries = trackedEntries(scriptsDirs.map((dir) => `${dir}/*.ts`));
  const byPath = new Map(
    entries.map(([mode, absolutePath]) => [relative(REPO_ROOT, absolutePath), mode]),
  );

  for (const dir of scriptsDirs) {
    for (const name of CLI_SCRIPT_NAMES) {
      const relPath = `${dir}/${name}.ts`;
      const mode = byPath.get(relPath);
      assert.equal(mode, CLI_MODE, `${relPath} is tracked with mode ${mode}, expected ${CLI_MODE}`);
      const firstLine = readFileSync(join(REPO_ROOT, relPath), "utf8").split(/\r?\n/, 1)[0];
      assert.equal(
        firstLine,
        CLI_SHEBANG,
        `${relPath} opens with ${JSON.stringify(firstLine)}, expected ${JSON.stringify(CLI_SHEBANG)}`,
      );
    }

    const libPath = `${dir}/dr_common.ts`;
    const libMode = byPath.get(libPath);
    assert.equal(libMode, LIB_MODE, `${libPath} is tracked with mode ${libMode}, expected ${LIB_MODE}`);
    const libFirstLine = readFileSync(join(REPO_ROOT, libPath), "utf8").split(/\r?\n/, 1)[0];
    assert.ok(
      !libFirstLine.startsWith("#!"),
      `${libPath} still carries a shebang: ${JSON.stringify(libFirstLine)}`,
    );
  }
});
