/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { editedFile } from "../hook_payload.ts";
import { check, checkEnglish } from "../mirror_prose.ts";
import { trackedFiles } from "../../../tests/_retirement.ts";

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

test("an edited .ja file whose english twin is missing is reported, and one whose twin exists is not", () => {
  const root = tempRoot("mirror-prose-verdict-");

  const missingJapaneseTwin = editedPath(
    writeFixture(root, ".ja/sample-missing-twin.ts", "// why-not: Convert the payload.\n// why-not: Persist it.\n"),
  );
  assert.ok(
    check(missingJapaneseTwin) !== null,
    "a .ja file whose prose lost every Japanese character must be reported",
  );

  const existingJapaneseTwin = editedPath(
    writeFixture(root, ".ja/sample-existing-twin.ts", "// why-not: Convert the payload.\n// why-not: 保存する\n"),
  );
  assert.equal(
    check(existingJapaneseTwin),
    null,
    "a .ja file whose prose still carries a Japanese character must not be reported",
  );
});

test("the sweep excludes node_modules, projects and logs, and the same predicate flags a fixture path inside them", () => {
  const root = tempRoot("mirror-prose-sweep-");
  const englishOnly = "// why-not: Convert the payload.\n// why-not: Persist it.\n";
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

test("an english-side file that kept the japanese original is reported by name", () => {
  const root = tempRoot("mirror-prose-english-sweep-");
  const relative = path.join("skills", "sample", "scripts", "m.ts");
  const japaneseBody = "// why-not: 語の重なりを数える。\n";
  writeFixture(root, relative, japaneseBody);
  writeFixture(root, path.join(".ja", relative), japaneseBody);

  const offenders = englishSweepOffenders(root, walk(root));
  assert.ok(
    offenders.includes(relative),
    `the english-side file left in Japanese must be reported by its own relative path: ${offenders.join(", ")}`,
  );
});

test("a .ja ts file whose only comment is a reference directive is not reported", () => {
  const root = tempRoot("mirror-prose-reference-");
  const filePath = writeFixture(
    root,
    ".ja/scripts/reference.ts",
    '/// <reference types="node" />\nexport const answer = 1;\n',
  );

  assert.equal(check(filePath), null);
});

test("a .ja ts file with no comment whose template literal holds markdown headings is not reported", () => {
  const root = tempRoot("mirror-prose-template-");
  const filePath = writeFixture(
    root,
    ".ja/scripts/update-index.ts",
    "export const readme = `# Decision Records\n\n## DR List\n\n*Last updated*: 2026-11-19\n`;\n",
  );

  assert.equal(check(filePath), null);
});

test("a .ja ts file whose why-not line is in English is reported", () => {
  const root = tempRoot("mirror-prose-why-not-english-");
  const filePath = writeFixture(
    root,
    ".ja/scripts/english.ts",
    "// why-not: x fails\nexport const answer = 1;\n",
  );

  assert.notEqual(check(filePath), null);
});

test("a .ja ts file whose why-not line is in Japanese is not reported", () => {
  const root = tempRoot("mirror-prose-why-not-japanese-");
  const filePath = writeFixture(
    root,
    ".ja/scripts/japanese.ts",
    "// why-not: x が落ちる\nexport const answer = 1;\n",
  );

  assert.equal(check(filePath), null);
});

test("a .ja sh file whose why-not line is in English is reported", () => {
  const root = tempRoot("mirror-prose-why-not-sh-");
  const filePath = writeFixture(
    root,
    ".ja/scripts/english.sh",
    "#!/bin/sh\n# why-not: x fails\necho done\n",
  );

  assert.notEqual(check(filePath), null);
});

test("a .ja ts file whose only English comment is not a why-not line is not reported", () => {
  const root = tempRoot("mirror-prose-plain-comment-");
  const filePath = writeFixture(
    root,
    ".ja/scripts/plain.ts",
    "// Convert the payload.\nexport const answer = 1;\n",
  );

  assert.equal(check(filePath), null);
});

test("an english-side ts file whose why-not line is in Japanese is reported", () => {
  const root = tempRoot("mirror-prose-english-why-not-");
  const relative = path.join("scripts", "japanese.ts");
  const body = "// why-not: x が落ちる\nexport const answer = 1;\n";
  const filePath = writeFixture(root, relative, body);
  writeFixture(root, path.join(".ja", relative), body);

  assert.notEqual(checkEnglish(filePath), null);
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
