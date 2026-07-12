import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const targets = {
  ja: join(root, ".ja", "skills", "issue", "references", "drafting.md"),
  en: join(root, "skills", "issue", "references", "drafting.md"),
};
const vetoPy = join(root, "hooks", "veto", "veto.py");

function read(path) {
  assert.ok(existsSync(path), `${path} が存在する`);
  return readFileSync(path, "utf8");
}

test("Skip 分岐の AskUserQuestion header が veto.py の固定照合文字列と両言語の drafting.md で一致している", () => {
  const header = "判定スキップ";
  assert.ok(
    read(vetoPy).includes(`"${header}"`),
    `veto.py が header ${header} を固定文字列で照合している`,
  );
  for (const [lang, path] of Object.entries(targets)) {
    assert.ok(
      read(path).includes(`\`${header}\``),
      `${lang}: drafting.md が header ${header} の AskUserQuestion を指示している`,
    );
  }
});
