import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { trackedFiles } from "./_retirement.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type InstructionFile = { lang: "en" | ".ja"; rel: string; full: string };

const scanInstructionDir = (
  prefix: "" | ".ja",
  lang: "en" | ".ja",
  dir: string,
): InstructionFile[] => {
  const base = prefix === "" ? `${dir}/` : `${prefix}/${dir}/`;
  const tracked = trackedFiles(root).filter((rel) => rel.startsWith(base));
  assert.ok(tracked.length > 0, `${base} holds no tracked file`);
  return tracked
    .filter((rel) => /\.(md|js|py)$/.test(rel))
    .map((rel) => ({
      lang,
      rel: prefix === "" ? rel : rel.slice(prefix.length + 1),
      full: join(root, rel),
    }));
};

const instructionFiles = () => {
  const found: InstructionFile[] = [];
  for (const prefix of ["", ".ja"] as const) {
    const lang: "en" | ".ja" = prefix === "" ? "en" : prefix;
    for (const dir of ["skills", "agents", "rules"]) {
      found.push(...scanInstructionDir(prefix, lang, dir));
    }
  }
  return found;
};

test("no live instruction, convention, or README carries the old name ADR outside when_to_use and the Fowler summary that declares it", async () => {
  const EXEMPT = "skills/dr/references/fowler-adr.md";
  const declares = { ja: /このファイルでは ADR と呼ぶ/, en: /it says ADR throughout/ };
  const exemptPaths: [keyof typeof declares, string][] = [
    ["ja", join(".ja", EXEMPT)],
    ["en", EXEMPT],
  ];
  for (const [lang, rel] of exemptPaths) {
    const doc = await readFile(join(root, rel), "utf8");
    assert.match(doc, declares[lang], `${lang}: the exempt file declares its grounds`);
  }

  const files = instructionFiles().filter((f) => f.rel !== EXEMPT);
  assert.ok(files.length > 50, `the number scanned (${files.length})`);
  for (const { lang, rel, full } of files) {
    const text = (await readFile(full, "utf8")).replace(/^when_to_use:.*$/gm, "");
    assert.doesNotMatch(text, /\bADRs?\b/, `${lang}: ${rel} still carries the old name ADR`);
  }
  assert.doesNotMatch(await readFile(join(root, "README.md"), "utf8"), /\bADRs?\b/, "README.md");
});

test("no skill outside its tests names a bundled asset by a home-anchored path other than settings.json", async () => {
  const RUNNING_SIDE = /\.claude\/settings\.json/;
  const HOME_ANCHORED = /~\/\.claude\/|\$HOME\/\.claude\//;
  const files = instructionFiles().filter(
    (f) => f.rel.startsWith("skills/") && !f.rel.includes("/tests/"),
  );
  assert.ok(files.length > 40, `the number scanned (${files.length})`);
  for (const { lang, rel, full } of files) {
    const named = (await readFile(full, "utf8"))
      .split("\n")
      .filter((line) => HOME_ANCHORED.test(line) && !RUNNING_SIDE.test(line))
      .map((line) => line.trim());
    assert.deepEqual(named, [], `${lang}: ${rel} names a bundled asset by a home-anchored path`);
  }
});

test("every agent naming a bundled asset pairs the plugin form with the fallback sentence", async () => {
  const FALLBACK = {
    en: "When a path below still begins with `${`, the harness left the variable unexpanded; read the same path under `~/.claude/` instead.",
    ".ja":
      "下のパスが `${` のまま始まっているときは harness が変数を展開していないので、代わりに `~/.claude/` 配下の同じパスを読む。",
  };
  const RUNNING_SIDE = /(~|\$HOME)\/\.claude\/(settings\.json|cache\/|history\/)/;
  const HOME_ANCHORED = /~\/\.claude\/|\$HOME\/\.claude\//;
  const files = instructionFiles().filter(
    (f) => f.rel.startsWith("agents/") && !f.rel.includes("/tests/"),
  );
  assert.ok(files.length >= 2, `the number scanned (${files.length})`);
  for (const { lang, rel, full } of files) {
    const text = await readFile(full, "utf8");
    const named = text
      .split("\n")
      .filter((line) => HOME_ANCHORED.test(line) && !RUNNING_SIDE.test(line))
      .map((line) => line.trim())
      .filter((line) => line !== FALLBACK[lang]);
    assert.deepEqual(named, [], `${lang}: ${rel} names a bundled asset by a home-anchored path`);
    if (text.includes("${CLAUDE_PLUGIN_ROOT}")) {
      assert.ok(
        text.includes(FALLBACK[lang]),
        `${lang}: ${rel} names the plugin form without the fallback sentence`,
      );
    }
  }
});

test("no skill grants Bash without narrowing it to the commands it names", async () => {
  const files = instructionFiles().filter((f) => f.rel.endsWith("/SKILL.md"));
  assert.ok(files.length >= 10, `the number scanned (${files.length})`);
  for (const { lang, rel, full } of files) {
    const grant = (await readFile(full, "utf8")).match(/^allowed-tools:.*$/m)?.[0] ?? "";
    assert.doesNotMatch(grant, /(^|\s)Bash(\s|$)/, `${lang}: ${rel} grants Bash unnarrowed`);
  }
});

test("no live instruction or convention names a workspace/ without .claude/", async () => {
  const BARE_WORKSPACE = /(?<!\.claude\/)(?<![\w/.])workspace\//;
  const files = instructionFiles();
  assert.ok(files.length > 50, `the number scanned (${files.length})`);
  for (const { lang, rel, full } of files) {
    const text = await readFile(full, "utf8");
    assert.doesNotMatch(text, BARE_WORKSPACE, `${lang}: ${rel} names a bare workspace/`);
  }
});

const frontmatter = (text: string) => text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
const pinsModel = (text: string) => /^model:/m.test(frontmatter(text));

test("no skill pins a model in its frontmatter", async () => {
  assert.equal(pinsModel("---\nname: x\nmodel: opus\n---\n# x\n"), true, "an opus pin is detected");
  assert.equal(pinsModel("---\nname: x\nmodel: fable\n---\n# x\n"), true, "a fable pin is detected");
  assert.equal(pinsModel("---\nname: x\n---\n# x\n"), false, "no pin once the line is gone");
  assert.equal(pinsModel("---\nname: x\n---\nmodel: opus\n"), false, "a body line is not a pin");

  const files = instructionFiles().filter((f) => /^skills\/[^/]+\/SKILL\.md$/.test(f.rel));
  assert.ok(files.length >= 10, `the number scanned (${files.length})`);
  for (const { lang, rel, full } of files) {
    const text = await readFile(full, "utf8");
    assert.ok(frontmatter(text), `${lang}: ${rel} has a readable frontmatter`);
    assert.equal(pinsModel(text), false, `${lang}: ${rel} pins a model`);
  }
});

const SENTENCE_END = /[。.]$/;
const whenToUse = (text: string) => frontmatter(text).match(/^when_to_use: (.*)$/m)?.[1] ?? "";

test("the when_to_use of use-cli-scout and sweep is a sentence, not a list of phrases", async () => {
  const oldList = "総点検, 全体を見直して, ホットパス, sweep, codebase scan";
  assert.doesNotMatch(oldList, SENTENCE_END, "a comma list of phrases is rejected");
  assert.match("A request to sweep the codebase.", SENTENCE_END, "a sentence is accepted");

  for (const skill of ["use-cli-scout", "sweep"]) {
    for (const prefix of ["", ".ja/"]) {
      const rel = `${prefix}skills/${skill}/SKILL.md`;
      const value = whenToUse(await readFile(join(root, rel), "utf8"));
      assert.ok(value, `${rel} carries when_to_use`);
      assert.match(value, SENTENCE_END, `${rel}: when_to_use ends as a sentence`);
    }
  }
});

test("critic-design asks for one more viewpoint before confirmed, with no token or phrase ban", async () => {
  const removed = {
    en: [/Do not save tokens/, /^\| Banned phrasing /m],
    ".ja": [/トークンを節約しない/, /^\| Banned phrasing /m],
  };
  const kept = { en: /^\| Before confirmed +\| /m, ".ja": /^\| confirmed の前 +\| /m };
  const oldLines = {
    en: "- Do not save tokens, and do not cut short the viewpoint checks\n| Banned phrasing    | Never use `looks reasonable` |",
    ".ja": "- トークンを節約しない。視点の確認を削らない\n| Banned phrasing    | 推論内で `looks reasonable` を禁止 |",
  };
  for (const lang of ["en", ".ja"] as const) {
    for (const pattern of removed[lang]) {
      assert.match(oldLines[lang], pattern, `${lang}: ${pattern} detects the old line`);
    }
    const rel = `${lang === "en" ? "" : ".ja/"}agents/critics/critic-design.md`;
    const doc = await readFile(join(root, rel), "utf8");
    for (const pattern of removed[lang]) {
      assert.doesNotMatch(doc, pattern, `${rel} still carries ${pattern}`);
    }
    assert.match(doc, kept[lang], `${rel} carries the row asking for one more viewpoint`);
  }
});

const namedTestPaths = (text: string) =>
  [...text.matchAll(/`(tests\/[^`\s*]+\.(?:ts|js))`/g)].map((m) => m[1]);

test("every tests/ path rules/conventions/SUBAGENT.md names exists", async () => {
  const stale = namedTestPaths("`tests/live-instructions.test.js` checks it.");
  assert.deepEqual(stale, ["tests/live-instructions.test.js"], "a named path is extracted");
  assert.equal(existsSync(join(root, stale[0])), false, "the retired .js name is reported missing");

  for (const rel of ["rules/conventions/SUBAGENT.md", ".ja/rules/conventions/SUBAGENT.md"]) {
    const named = namedTestPaths(await readFile(join(root, rel), "utf8"));
    assert.ok(named.length > 0, `${rel} names a tests/ path`);
    for (const path of named) {
      assert.ok(existsSync(join(root, path)), `${rel} names ${path}, which does not exist`);
    }
  }
});

const sectionOf = (doc: string, heading: string) =>
  doc.split(/^## /m).find((part) => part.startsWith(`${heading}\n`)) ?? "";
const firstColumn = (text: string) =>
  text
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) => line.split("|")[1].trim());

test("TESTING.md lists the five shapes of a test that swings at nothing, on both sides", async () => {
  const expected = {
    en: [
      "Whether the test swings at nothing",
      [
        "Input built from the artifact",
        "A missing premise returns empty",
        "A different test fails",
        "An absence check with no positive control",
        "Counts compared after the same filter",
      ],
    ],
    ".ja": [
      "テストが空振りしていないか",
      [
        "検査対象を成果物から作る",
        "前提の欠落が空を返す",
        "別のテストが落ちる",
        "不在の検査に陽性対照がない",
        "同じ条件で絞った後の件数を比べる",
      ],
    ],
  } as const;
  for (const [lang, [heading, labels]] of Object.entries(expected)) {
    const rel = `${lang === "en" ? "" : ".ja/"}rules/development/TESTING.md`;
    const doc = await readFile(join(root, rel), "utf8");
    assert.deepEqual(firstColumn(sectionOf(doc, heading)), labels, `${rel} § ${heading}`);
  }
});

test("DOCUMENTS.md divides the ground between four documents and routes with three rules, on both sides", async () => {
  for (const [rel, routing] of [
    ["rules/conventions/DOCUMENTS.md", "Routing"],
    [".ja/rules/conventions/DOCUMENTS.md", "ルーティング"],
  ]) {
    const doc = await readFile(join(root, rel), "utf8");
    const intro = doc.split(/^## /m)[0];
    assert.deepEqual(
      firstColumn(intro),
      ["`rules/`", "`docs/decisions/`", "`CLAUDE.md`", "`docs/research/`"],
      `${rel} document table`,
    );
    const items = sectionOf(doc, routing)
      .split("\n")
      .flatMap((line) => line.match(/^(\d+)\. /)?.[1] ?? []);
    assert.deepEqual(items, ["1", "2", "3"], `${rel} § ${routing}`);
  }
});
