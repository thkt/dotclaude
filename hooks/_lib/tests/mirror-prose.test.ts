/// <reference types="node" />
// Ports hooks/_lib/tests/mirror_prose_test.py's TargetSelection / Verdict / EnglishVerdict /
// MirrorSweep suites to mirror_prose.ts's side (DR-0112, issue #644, unit U-001). `check`'s own
// determination is the "correspondence" this unit's goal names: a .ja file's prose either still
// pairs with Japanese (a character survives) or it does not (the file went English-only and its
// Japanese twin -- the Japanese half of its own prose, not a second file -- is missing).
// `_python_prose` (mirror_prose.py:44-70) stays out of scope here; unit U-002
// (mirror-prose-python.test.ts) covers it.
//
// The two full-tree sweeps mirror_prose_test.py's MirrorSweep class ran against the real repo
// move here as their own scenarios (T-367, T-368), each against an isolated temp tree rather
// than the live repo: a temp tree keeps the exclusion behavior deterministic and keeps the test
// from depending on -- or mutating -- this checkout's actual .ja/ content. node_modules/,
// projects/, and logs/ replace mirror_prose.py's __pycache__/.git exclusions -- the ones this
// repo's own tree can actually grow under a plain filesystem walk (git ls-files already leaves
// gitignored directories out, so a walk that reused it would not need this exclusion at all;
// mirror_prose's sweep walks the filesystem directly, the same way mirror_prose.py's rglob does).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { editedFile } from "../hook_payload.ts";
import { check, checkEnglish } from "../mirror_prose.ts";

function tempRoot(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function writeFixture(root: string, relative: string, content: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

/** The path hook_payload.ts's editedFile resolves for a Write of `absolutePath`, so a case reads
 * as "this file was just edited" the same way hook-payload-parity.test.ts's T-002 does. */
function editedPath(absolutePath: string): string {
  const payload = JSON.stringify({ tool_name: "Write", tool_input: { file_path: absolutePath } });
  const resolved = editedFile(payload);
  assert.ok(resolved, "editedFile must resolve a Write payload's file_path");
  return resolved;
}

const EXCLUDED_DIR_NAMES = new Set(["node_modules", "projects", "logs"]);

/** mirror_prose_test.py's MirrorSweep.rglob walk, adapted to prune node_modules/, projects/,
 * and logs/ during the walk itself rather than filtering them out afterward -- pruning is what
 * keeps a real node_modules subtree from being read file by file. */
function walk(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
      out.push(...walk(path.join(root, entry.name)));
    } else if (entry.isFile()) {
      out.push(path.join(root, entry.name));
    }
  }
  return out;
}

/** mirror_prose_test.py's test_no_mirror_file_lost_its_japanese, parameterized by root instead
 * of the live repo. */
function jaSweepOffenders(root: string): string[] {
  return walk(root)
    .filter((absolute) => check(absolute) !== null)
    .map((absolute) => path.relative(root, absolute));
}

/** mirror_prose_test.py's test_no_english_side_file_kept_the_japanese_original, parameterized by
 * root instead of the live repo. */
function englishSweepOffenders(root: string): string[] {
  return walk(root)
    .filter((absolute) => checkEnglish(absolute) !== null)
    .map((absolute) => path.relative(root, absolute));
}

test("T-366 an edited .ja file whose english twin is missing is reported, and one whose twin exists is not", () => {
  const root = tempRoot("mirror-prose-verdict-");

  const missingJapaneseTwin = editedPath(
    writeFixture(root, ".ja/sample-missing-twin.ts", "// Convert the payload.\n// Persist it.\n"),
  );
  assert.ok(
    check(missingJapaneseTwin) !== null,
    "a .ja file whose prose lost every Japanese character must be reported",
  );

  const existingJapaneseTwin = editedPath(
    writeFixture(root, ".ja/sample-existing-twin.ts", "// Convert the payload.\n// 保存する\n"),
  );
  assert.equal(
    check(existingJapaneseTwin),
    null,
    "a .ja file whose prose still carries a Japanese character must not be reported",
  );
});

test("T-367 the sweep excludes node_modules, projects and logs, and the same predicate flags a fixture path inside them", () => {
  const root = tempRoot("mirror-prose-sweep-");
  const englishOnly = "// Convert the payload.\n// Persist it.\n";
  const excluded = [
    writeFixture(root, "node_modules/pkg/.ja/sample.ts", englishOnly),
    writeFixture(root, "projects/scratch/.ja/sample.ts", englishOnly),
    writeFixture(root, "logs/.ja/sample.ts", englishOnly),
  ];

  const offenders = jaSweepOffenders(root);
  for (const absolute of excluded) {
    assert.ok(
      !offenders.includes(path.relative(root, absolute)),
      `the sweep must not walk into ${path.relative(root, path.dirname(absolute))}`,
    );
  }

  for (const absolute of excluded) {
    assert.ok(
      check(absolute) !== null,
      `the predicate itself must still flag ${path.relative(root, absolute)} outside the sweep, ` +
        "proving the exclusion above comes from the walk and not from check",
    );
  }
});

test("T-368 an english-side file that kept the japanese original is reported by name", () => {
  const root = tempRoot("mirror-prose-english-sweep-");
  const relative = path.join("skills", "sample", "scripts", "m.ts");
  const japaneseBody = "// 語の重なりを数える。\n";
  writeFixture(root, relative, japaneseBody);
  writeFixture(root, path.join(".ja", relative), japaneseBody);

  const offenders = englishSweepOffenders(root);
  assert.ok(
    offenders.includes(relative),
    `the english-side file left in Japanese must be reported by its own relative path: ${offenders.join(", ")}`,
  );
});
