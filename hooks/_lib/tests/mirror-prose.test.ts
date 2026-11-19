/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { editedFile } from "../hook_payload.ts";
import { check, checkEnglish } from "../mirror_prose.ts";
import { trackedFiles } from "../../../workflows/_lib/tests/_retirement.ts";

function tempRoot(prefix: string): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

function writeFixture(root: string, relative: string, content: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

function editedPath(absolutePath: string): string {
  const payload = JSON.stringify({ tool_name: "Write", tool_input: { file_path: absolutePath } });
  const resolved = editedFile(payload);
  assert.ok(resolved, "editedFile must resolve a Write payload's file_path");
  return resolved;
}

const EXCLUDED_DIR_NAMES = new Set(["node_modules", "projects", "logs", ".git", "__pycache__"]);

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

function jaSweepOffenders(root: string, files: string[]): string[] {
  return files
    .filter((absolute) => check(absolute) !== null)
    .map((absolute) => path.relative(root, absolute));
}

function englishSweepOffenders(root: string, files: string[]): string[] {
  return files
    .filter((absolute) => checkEnglish(absolute) !== null)
    .map((absolute) => path.relative(root, absolute));
}

function trackedUnder(repo: string, prefix: string): string[] {
  return trackedFiles(repo)
    .filter((relative) => relative.startsWith(prefix))
    .map((relative) => path.join(repo, relative));
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

  const offenders = jaSweepOffenders(root, walk(root));
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

  const offenders = englishSweepOffenders(root, walk(root));
  assert.ok(
    offenders.includes(relative),
    `the english-side file left in Japanese must be reported by its own relative path: ${offenders.join(", ")}`,
  );
});

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("no .ja file in this checkout lost its Japanese", () => {
  const mirror = path.join(REPO, ".ja");
  const files = trackedUnder(REPO, ".ja/");
  assert.ok(files.length > 0, "this checkout tracks a .ja/ tree for the sweep to read");

  assert.deepEqual(jaSweepOffenders(mirror, files), [], ".ja/ files that lost their Japanese");
});

test("no english-side file in this checkout kept the japanese original", () => {
  const files = trackedUnder(REPO, "");
  assert.ok(files.length > 0, "this checkout tracks files for the sweep to read");

  assert.deepEqual(englishSweepOffenders(REPO, files), [], "English-side files still in Japanese");
});
