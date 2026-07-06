// marketplace/build/ (plugin 配布物) は workflows/ と skills/ からの実ファイルコピー。
// このテストが dev tree と配布物の byte 一致を強制し、片側だけの編集を commit 前に検出する。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// EN (workflows/build/tests) と .ja ミラー (.ja/workflows/build/tests) で深さが違うため、
// marketplace/ を含む階層まで遡って repo root を解決する。
let root = dirname(fileURLToPath(import.meta.url));
while (!existsSync(join(root, "marketplace")) && root !== dirname(root)) {
  root = dirname(root);
}

// 配布物として同期する必要があるのは正確にこの 21 ファイル。
// .claude-plugin/{plugin,marketplace}.json と hooks/hooks.json は plugin 専用で dev tree に対応物を持たない。
const MIRRORED = [
  "workflows/build.js",
  "workflows/code.js",
  "workflows/audit.js",
  "workflows/polish.js",
  "workflows/build/revalidate.py",
  "workflows/build/pr-body.py",
  "workflows/audit/snapshot.py",
  "skills/pr/templates/pr.md",
  "hooks/veto/pre-issue-create.sh",
  "hooks/veto/veto.py",
  "hooks/veto/record-bash.sh",
  "skills/issue/SKILL.md",
  "skills/issue/references/phrases.en.md",
  "skills/issue/references/phrases.ja.md",
  "skills/issue/references/plan-section.md",
  "skills/issue/references/premise-check.md",
  "skills/issue/references/prose-review.md",
  "skills/issue/references/tentative-marking.md",
  "skills/issue/templates/bug.md",
  "skills/issue/templates/chore.md",
  "skills/issue/templates/docs.md",
  "skills/issue/templates/feature.md",
];

for (const rel of MIRRORED) {
  test(`marketplace/build/${rel} が dev tree と byte 一致する`, () => {
    const dev = readFileSync(join(root, rel));
    const dist = readFileSync(join(root, "marketplace", "build", rel));
    assert.ok(
      dev.equals(dist),
      `${rel} が dev tree と配布物で相違。編集後は marketplace/build/ へコピーして同期する`,
    );
  });
}
