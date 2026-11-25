import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { trackedFiles } from "./_tracked-files.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCANNED = ["agents", "rules", "skills", "docs"];
const SKIPPED = new Set(["docs/decisions", "docs/research"]);

const CONTINUES_A_BLOCK = /^(?:[|#>*-]|\d+[.)]\s)/;
const OPENS_A_BLOCK = /^(?:[|*-]|\d+[.)]\s|```)/;

const nextNonEmpty = (lines: string[], i: number) => {
  for (let j = i + 1; j < lines.length; j++) if (lines[j].trim()) return lines[j].trim();
  return "";
};

const markdownUnder = (dir: string): string[] => {
  const base = `${relative(root, dir)}/`;
  return trackedFiles(root)
    .filter((rel) => rel.startsWith(base) && rel.endsWith(".md"))
    .filter((rel) => ![...SKIPPED].some((skipped) => rel.startsWith(`${skipped}/`)))
    .map((rel) => join(root, rel));
};

const paragraphsAfterTables = (source: string): { line: number; text: string }[] => {
  const lines = source.split("\n");
  const start = lines[0] === "---" ? lines.indexOf("---", 1) + 1 : 0;
  const out: { line: number; text: string }[] = [];
  let inTable = false;
  let inFence = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("```")) {
      inFence = !inFence;
      inTable = false;
      continue;
    }
    if (inFence || !line) continue;
    if (inTable && !CONTINUES_A_BLOCK.test(line) && !OPENS_A_BLOCK.test(nextNonEmpty(lines, i))) {
      out.push({ line: i + 1, text: line });
    }
    inTable = line.startsWith("|");
  }
  return out;
};

const scan = async () => {
  const offenders = [];
  for (const prefix of ["", ".ja"]) {
    for (const dir of SCANNED) {
      for (const path of markdownUnder(join(root, prefix, dir))) {
        for (const { line, text } of paragraphsAfterTables(await readFile(path, "utf8"))) {
          offenders.push(`${relative(root, path)}:${line} ${text.slice(0, 70)}`);
        }
      }
    }
  }
  return { offenders };
};

test("no explanation sits below the table it explains", async () => {
  const { offenders } = await scan();
  assert.deepEqual(offenders, [], `move the explanation above its table:\n${offenders.join("\n")}`);
});

test("the scan reaches the files it names", () => {
  const counts = SCANNED.map((dir) => markdownUnder(join(root, dir)).length);
  assert.ok(Math.min(...counts) > 0, `every scanned directory holds markdown: ${counts}`);
});

test("historical originals are excluded while current docs pages remain scanned", () => {
  const files = markdownUnder(join(root, "docs")).map((path) => relative(root, path));
  assert.ok(files.includes("docs/HOOKS.md"));
  assert.ok(!files.some((path) => path.startsWith("docs/research/")));
});

test("the classifier separates a trailing explanation from the shapes that are not one", () => {
  const table = "| a | b |\n| - | - |\n| 1 | 2 |\n";
  const cases: [string, string, string[]][] = [
    ["a trailing paragraph", `${table}\nExplains the rows above.\n`, ["Explains the rows above."]],
    ["an ordered list", `${table}\n1. A step, not a paragraph.\n`, []],
    ["a lead-in to a list", `${table}\nThe options are:\n\n- one\n`, []],
    ["a lead-in to a table", `${table}\nThe next table:\n\n${table}`, []],
    ["a fenced block", `${table}\n\`\`\`\nnot prose\n\`\`\`\n`, []],
  ];
  for (const [name, source, expected] of cases) {
    assert.deepEqual(
      paragraphsAfterTables(source).map((h) => h.text),
      expected,
      name,
    );
  }
});
