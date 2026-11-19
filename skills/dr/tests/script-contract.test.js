import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTPUT_KEYS } from "../scripts/pre-check.ts";
import { REQUIRED_SECTIONS, RECOMMENDED_SECTIONS, STATUS_VALUES } from "../scripts/validate-dr.ts";
import { STATUS_SECTIONS } from "../scripts/update-index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const at = (lang, ...parts) =>
  join(root, ...(lang === "ja" ? [".ja"] : []), "skills", "dr", ...parts);
const pair = (...parts) => ({ ja: at("ja", ...parts), en: at("en", ...parts) });

const skills = pair("SKILL.md");
const templates = pair("templates", "madr-template.md");
const formats = pair("references", "madr-format.md");

const statusValues = (regex) => regex.source.replace(/^\^\(\?:/, "").replace(/\)\$$/, "").split("|");

const eachLanguage = async (paths, check) => {
  for (const [lang, path] of Object.entries(paths)) {
    await check(await readFile(path, "utf8"), lang);
  }
};

test("SKILL.md uses pre-check's output keys", async () => {
  const keys = OUTPUT_KEYS;
  assert.ok(keys.includes("filename"), `the output keys are readable (${keys.join(", ")})`);
  assert.ok(keys.length >= 6, `six or more keys are present (${keys.length})`);

  const consumed = ["filename", "dr_dir", "similar_drs", "date"];
  await eachLanguage(skills, (doc, lang) => {
    for (const key of consumed) {
      assert.match(doc, new RegExp(`\\b${key}\\b`), `${lang}: SKILL.md names ${key}`);
    }
  });
});

test("madr-format writes the supersede identifier as DR-NNNN", () =>
  eachLanguage(formats, (doc, lang) => {
    assert.match(doc, /superseded by DR-NNNN/, `${lang}: it writes DR-NNNN`);
  }));

test("madr-format states that the scope is not limited to architecture", () => {
  const widened = { ja: /アーキテクチャに限らない決定/, en: /decisions beyond architecture/ };
  return eachLanguage(formats, (doc, lang) => {
    assert.match(doc, widened[lang], `${lang}: it states the widened scope`);
  });
});

const FIELDS = ["status", "date", "decision-makers", "consulted", "informed"];

test("every frontmatter field has a slot in the template", async () => {
  await eachLanguage(skills, (doc, lang) => {
    for (const field of FIELDS) {
      assert.match(doc, new RegExp(`^\\| ${field} `, "m"), `${lang}: the table carries ${field}`);
    }
  });
  await eachLanguage(templates, (doc, lang) => {
    for (const field of FIELDS) {
      assert.match(doc, new RegExp(`^${field}: `, "m"), `${lang}: the template carries ${field}`);
    }
  });
});

test("the required sections match between the template and validate-dr", async () => {
  const sections = REQUIRED_SECTIONS;
  assert.ok(sections.length >= 4, `the required sections are readable (${sections.join(" / ")})`);
  await eachLanguage(templates, (doc, lang) => {
    for (const section of sections) {
      assert.match(doc, new RegExp(`^#{2,3} ${section}$`, "m"), `${lang}: the ${section} heading`);
    }
  });
});

test("the process Steps run without a gap and every cited stage has a row", () => {
  const CITED = ["Validate", "Index"];
  return eachLanguage(skills, (doc, lang) => {
    const rows = [...doc.matchAll(/^\| (\d+) {4}\| (\S+)/gm)];
    const steps = rows.map((m) => Number(m[1]));
    assert.ok(steps.length >= 5, `${lang}: the process table is readable (${steps.length})`);
    assert.deepEqual(
      steps,
      steps.map((_, i) => i + 1),
      `${lang}: the Steps run 1 through ${steps.length}`,
    );
    const stages = rows.map((m) => m[2]);
    for (const stage of CITED) {
      assert.ok(stages.includes(stage), `${lang}: the cited stage ${stage} has a row`);
      const uses = doc.split(stage).length - 1;
      assert.ok(uses >= 2, `${lang}: ${stage} is named beyond its own row (${uses})`);
    }
    assert.doesNotMatch(doc, /Step \d/, `${lang}: nothing points at a Step by number`);
    for (const stage of stages) {
      const collides = new RegExp(`^## ${stage}$`, "m");
      assert.doesNotMatch(doc, collides, `${lang}: ${stage} is a stage and not also a section`);
    }
  });
});

test("the Critique stage calls the critic-design agent that agents/ defines, and allowed-tools grants Agent", async () => {
  const agent = await readFile(join(root, "agents", "critics", "critic-design.md"), "utf8");
  assert.match(agent, /^name: critic-design$/m, "agents/critics/critic-design.md defines critic-design");
  await eachLanguage(skills, (doc, lang) => {
    const row = doc.split("\n").find((line) => /^\| \d+ {4}\| Critique /.test(line));
    assert.ok(row, `${lang}: the process table carries a Critique row`);
    assert.match(row, /critic-design/, `${lang}: the Critique row names critic-design`);
    const grant = doc.match(/^allowed-tools:.*$/m)?.[0] ?? "";
    assert.match(grant, /(^|\s)Agent(\s|$)/, `${lang}: allowed-tools grants Agent`);
  });
});

test("every section a step cites exists", () =>
  eachLanguage(skills, (doc, lang) => {
    const cited = [...doc.matchAll(/\(§ ([^)]+)\)/g)].map((m) => m[1]);
    assert.equal(cited.length, 4, `${lang}: the body cites four sections`);
    for (const name of cited) {
      assert.match(doc, new RegExp(`^## ${name}$`, "m"), `${lang}: ## ${name} exists`);
    }
  }));

test("the decision type table carries type, use case, and topics only", () =>
  eachLanguage(skills, (doc, lang) => {
    const row = doc.split("\n").find((line) => line.startsWith("| technology-selection"));
    assert.ok(row, `${lang}: the decision type table is readable`);
    assert.equal(row.split("|").length - 2, 3, `${lang}: the row carries three columns`);
  }));

const LINE_CAP = { en: /\d+(-\d+)? (lines|bullets)/, ja: /\d+(〜\d+)? ?(行|項目)/ };
const decisionTypeSection = (doc) => doc.split(/^## (?:Decision Type|決定タイプ)$/m)[1]?.split(/^## /m)[0];

test("the Decision Type section states what each section carries, with no line cap", () => {
  const oldSentence = {
    en: "Per-section guidance is common to all types: Context 3 lines, Options 3-5 lines each, Consequences 2-3 bullets.",
    ja: "分量は全タイプ共通で、Context は 3 行、Options は各 3〜5 行、Consequences は箇条書き 2〜3 項目とする。",
  };
  return eachLanguage(skills, (doc, lang) => {
    assert.match(oldSentence[lang], LINE_CAP[lang], `${lang}: the old cap sentence is detected`);
    const section = decisionTypeSection(doc);
    assert.ok(section, `${lang}: the Decision Type section is readable`);
    assert.doesNotMatch(section, LINE_CAP[lang], `${lang}: Decision Type states a line cap`);
  });
});

test("every recommended section reaches the template, the body, and the format reference", async () => {
  const sections = RECOMMENDED_SECTIONS;
  assert.ok(
    sections.length >= 1,
    `the recommended sections are readable (${sections.join(" / ")})`,
  );
  for (const section of sections) {
    await eachLanguage(templates, (doc, lang) => {
      assert.match(doc, new RegExp(`^#{2,3} ${section}$`, "m"), `${lang}: the ${section} heading`);
    });
    await eachLanguage(skills, (doc, lang) => {
      assert.match(doc, new RegExp(section), `${lang}: the body names ${section}`);
    });
    await eachLanguage(formats, (doc, lang) => {
      const row = doc.split("\n").find((line) => line.startsWith(`| ${section} `));
      assert.ok(row, `${lang}: madr-format carries a ${section} row`);
      const optional = doc.slice(doc.search(/^## (任意セクション|Optional Sections)$/m));
      assert.ok(!optional.includes(section), `${lang}: ${section} is not filed as optional`);
    });
  }
});

test("every status value has a section in update-index and a row in madr-format", async () => {
  const values = statusValues(STATUS_VALUES);
  assert.ok(values.length >= 5, `the status values are readable (${values.join(" / ")})`);
  const sections = STATUS_SECTIONS.map(([key]) => key);
  assert.ok(sections.length >= 5, `the index sections are readable (${sections.join(", ")})`);
  for (const value of values) {
    const key = value.split(" ")[0];
    assert.ok(sections.includes(key), `the ${key} key buckets into update-index (${sections.join(", ")})`);
  }
  await eachLanguage(formats, (doc, lang) => {
    for (const value of values) {
      const row = value.replace("\\d{4}", "NNNN");
      assert.match(doc, new RegExp(`^\\| ${row} `, "m"), `${lang}: the lifecycle lists ${row}`);
    }
  });
});

test("the Pre-Check stage tells the agent to check open pull requests by hand when pre-check could not", () =>
  eachLanguage(skills, (doc, lang) => {
    const row = doc.split("\n").find((line) => /^\| 1 {4}\| Pre-Check /.test(line));
    assert.ok(row, `${lang}: the process table carries a Pre-Check row`);
    assert.match(row, /`gh pr list --state open`/, `${lang}: the Pre-Check row names the manual check`);
  }));
