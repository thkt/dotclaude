import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { trackedFiles } from "./_tracked-files.ts";

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
  const fallbackOf = async (rel: string) => {
    const quoted = (await readFile(join(root, rel), "utf8"))
      .split("\n")
      .filter((line) => line.startsWith("> "));
    assert.equal(quoted.length, 1, `${rel} carries the fallback sentence as its one "> " line`);
    return quoted[0].slice(2);
  };
  const FALLBACK = {
    en: await fallbackOf("rules/conventions/SUBAGENT.md"),
    ".ja": await fallbackOf(".ja/rules/conventions/SUBAGENT.md"),
  };
  const RUNNING_SIDE = /(~|\$HOME)\/\.claude\/(settings\.json|cache\/|history\/)/;
  const HOME_ANCHORED = /~\/\.claude\/|\$HOME\/\.claude\//;
  const MISSING_FALLBACK = "the plugin form without the fallback sentence";
  const offenses = (text: string, fallback: string) => [
    ...text
      .split("\n")
      .filter((line) => HOME_ANCHORED.test(line) && !RUNNING_SIDE.test(line))
      .map((line) => line.trim())
      .filter((line) => line !== fallback),
    ...(text.includes("${CLAUDE_PLUGIN_ROOT}") && !text.includes(fallback) ? [MISSING_FALLBACK] : []),
  ];

  const pluginForm = "Read `${CLAUDE_PLUGIN_ROOT}/skills/use-cli-scout/SKILL.md`.";
  const homeAnchored = "Read `~/.claude/skills/use-cli-scout/SKILL.md`.";
  for (const lang of ["en", ".ja"] as const) {
    const fallback = FALLBACK[lang];
    assert.deepEqual(offenses(pluginForm, fallback), [MISSING_FALLBACK], `${lang}: plugin form alone`);
    assert.deepEqual(offenses(homeAnchored, fallback), [homeAnchored], `${lang}: home-anchored path`);
    assert.deepEqual(offenses(`${fallback}\n\n${pluginForm}`, fallback), [], `${lang}: paired form`);
  }

  const files = instructionFiles().filter(
    (f) => f.rel.startsWith("agents/") && !f.rel.includes("/tests/"),
  );
  assert.ok(files.length >= 2, `the number scanned (${files.length})`);
  for (const { lang, rel, full } of files) {
    const found = offenses(await readFile(full, "utf8"), FALLBACK[lang]);
    assert.deepEqual(found, [], `${lang}: ${rel} names a bundled asset outside the paired form`);
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
