/// <reference types="node" />
// Behavioral parity tests for skills/scribe/scripts/structure_page.ts against the retired
// Python original (that suite carried T-001/T-002/T-003/T-004/T-005; T-008/T-009's CI discovery
// is replaced here with a check against test.yml's own Node tests glob, read via
// skills/scribe/scripts/find_wiki_rule.ts's globToRegExp -- the same reuse
// skills/scribe/tests/find-wiki-rule.test.ts's own T-218 makes against tracked files).
//
// U-005 Red step: SECTIONS/findStructurePages/readClaims are scaffolded to throw
// (skills/scribe/scripts/structure_page.ts), so every assertion below fails on that thrown
// error rather than on a module-resolution or type-check failure.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { globToRegExp } from "../scripts/find_wiki_rule.ts";
import { findStructurePages, readClaims } from "../scripts/structure_page.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/scribe/tests -> skills/scribe -> skills -> repo root, the same climb
// skills/scribe/tests/find-wiki-rule.test.ts's own REPO_ROOT constant makes.
const REPO_ROOT = join(HERE, "..", "..", "..");
const WIKI = join(REPO_ROOT, "docs", "wiki");
const WORKFLOW_YML = join(REPO_ROOT, ".github", "workflows", "test.yml");

// The one structure page whose 契約/要求 name workflows/*.js machinery. T-229 cross-checks this
// page against the workflow script it describes, so the page is fixed rather than discovered.
const PAGE = join(WIKI, "workflow-structure.md");

// Spelled out here rather than imported from structure_page.ts: the scan below exists to reach
// the same answer independently, so borrowing the module's own literal would make the two sides
// echo.
const KIND_LINE = "kind: structure";

/** The lines between the opening and closing `---` delimiters, found by scanning to the closing
 * delimiter rather than assuming a fixed position. Independent of findStructurePages: this reads
 * the raw file directly, so the two sides can be compared instead of one echoing the other. */
function frontmatterLines(pagePath: string): string[] {
  const lines = readFileSync(pagePath, "utf8").split("\n");
  if (lines.length === 0 || lines[0] !== "---") return [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(1, i);
  }
  return [];
}

/** Every docs/wiki page whose frontmatter carries `kind: structure`, found by scanning every
 * page's frontmatter directly rather than calling findStructurePages. */
function structurePagesByScan(): string[] {
  return readdirSync(WIKI)
    .filter((name) => name.endsWith(".md"))
    .filter((name) => frontmatterLines(join(WIKI, name)).includes(KIND_LINE))
    .sort();
}

/** The lines of one `## heading` section, up to the next `## ` heading or the end. */
function sectionBody(text: string, heading: string): string {
  const marker = `\n## ${heading}\n`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return "";
  const body = text.slice(markerIndex + marker.length);
  const nextHeading = body.indexOf("\n## ");
  return nextHeading === -1 ? body : body.slice(0, nextHeading);
}

function bulletRows(body: string): string[] {
  return body.split("\n").filter((line) => line.startsWith("- "));
}

/** A table's data rows, with the header row and its `---` separator row excluded. Both always
 * come first when a table is present, so the check is positional, not a pattern match on `---`
 * that a data row's own contents could also produce. */
function tableDataRows(body: string): string[] {
  const lines = body.split("\n").filter((line) => line.startsWith("|"));
  if (lines.length < 2) return [];
  return lines.slice(2);
}

test(
  "T-227 findStructurePages returns the same page set as an independent frontmatter scan of docs/wiki, compared as names",
  () => {
    const found = findStructurePages(WIKI).map((p) => p.split("/").pop());
    const expected = structurePagesByScan();
    assert.ok(expected.length > 0, "docs/wiki carries at least one kind: structure page");
    assert.deepEqual(found, expected);
  },
);

test(
  "T-228 the 境界 bullets and the 契約 and 要求 table rows come back as three lists with the header and separator rows excluded",
  () => {
    const pages = findStructurePages(WIKI);
    assert.ok(pages.length > 0, "docs/wiki carries at least one kind: structure page");
    for (const page of pages) {
      const text = readFileSync(page, "utf8");
      const claims = readClaims(page);
      for (const section of ["境界", "契約", "要求"]) {
        assert.ok(section in claims, `${page}: ${section}`);
      }

      const expectedBoundary = bulletRows(sectionBody(text, "境界"));
      assert.deepEqual(claims["境界"], expectedBoundary, `${page}: 境界`);

      for (const section of ["契約", "要求"]) {
        const expectedRows = tableDataRows(sectionBody(text, section));
        assert.deepEqual(claims[section], expectedRows, `${page}: ${section}`);
        for (const row of claims[section]) {
          assert.doesNotMatch(
            row,
            /^\|(?: *-+ *\|)+$/,
            `${page}: ${section} carries a separator row`,
          );
        }
      }

      // 境界 comes back as its own collection, not merged with the table sections.
      assert.notDeepEqual(
        claims["境界"],
        claims["契約"],
        `${page}: 境界 and 契約 come back separately`,
      );
    }
  },
);

function extractUnitCaps(source: string): { files: number; tests: number } | null {
  const match = source.match(/UNIT_CAPS\s*=\s*\{\s*files:\s*(\d+),\s*tests:\s*(\d+)\s*\}/);
  if (match === null) return null;
  return { files: Number(match[1]), tests: Number(match[2]) };
}

/** The file a 参照コード bullet names beside the given constant/function name, read from the
 * bullet's own text rather than assumed. `- \`<path>\` の \`<name>\`` is the section's own
 * format, checked separately by T-228. */
function referencedPath(claims: Record<string, string[]>, name: string): string {
  const bullet = claims["参照コード"].find((row) => row.includes(name));
  assert.ok(bullet, `参照コード names ${name}`);
  const match = (bullet as string).match(new RegExp("`([^`]+)` の `" + name + "`"));
  assert.ok(match, `参照コード names ${name} without a \`<path>\` の \`${name}\` bullet`);
  return join(REPO_ROOT, (match as RegExpMatchArray)[1]);
}

test(
  "T-229 the unit caps workflow-structure.md states equal build.js's UNIT_CAPS, and a copy of build.js with the constant renamed makes the extraction fail",
  () => {
    const claims = readClaims(PAGE);
    const row = claims["要求"].find((r) => r.includes("`build` の unit"));
    assert.ok(row, "要求 states build's unit caps");
    const match = (row as string).match(/files (\d+) \/ tests (\d+)/);
    assert.ok(match, `要求 states build's unit caps as 'files N / tests N': ${row}`);
    const pageCaps = {
      files: Number((match as RegExpMatchArray)[1]),
      tests: Number((match as RegExpMatchArray)[2]),
    };

    const scriptPath = referencedPath(claims, "UNIT_CAPS");
    const scriptSource = readFileSync(scriptPath, "utf8");
    const scriptCaps = extractUnitCaps(scriptSource);
    assert.ok(scriptCaps !== null, `${scriptPath} carries a UNIT_CAPS constant`);
    assert.deepEqual(pageCaps, scriptCaps);

    const renamed = scriptSource.replaceAll("UNIT_CAPS", "UNIT_CAPS_RENAMED");
    assert.equal(
      extractUnitCaps(renamed),
      null,
      "renaming the constant the page's 参照コード names makes the check unable to find it",
    );
  },
);

/** Every quoted glob token the Node tests step's `run:` block lists in test.yml, read from the
 * workflow file itself rather than restated here, so a step content change shows up as a
 * mismatch instead of two copies that happen to agree. */
function ciNodeTestGlobs(): string[] {
  const text = readFileSync(WORKFLOW_YML, "utf8");
  const stepIndex = text.indexOf("name: Node tests");
  assert.ok(stepIndex !== -1, "test.yml carries a Node tests step");
  const rest = text.slice(stepIndex);
  const nextStepIndex = rest.indexOf("\n      - name:", 1);
  const block = nextStepIndex === -1 ? rest : rest.slice(0, nextStepIndex);
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

test(
  "T-230 every workflow the page names reaches a no-repo stop carrying why, and CI's Node tests glob in test.yml covers this test file",
  () => {
    const claims = readClaims(PAGE);
    const content = claims["内容"].join("\n");
    const names = [...content.matchAll(/`([a-z]+)`/g)].map((m) => m[1]);
    assert.ok(names.length > 0, "内容 names the workflows in backticks");
    for (const name of names) {
      const scriptPath = join(REPO_ROOT, "workflows", `${name}.js`);
      assert.ok(existsSync(scriptPath), `${name}: ${scriptPath} exists`);
      const source = readFileSync(scriptPath, "utf8");
      const inline = source.includes('stopped: "no-repo"');
      const viaHelper = /stop\(\s*["']no-repo["']/.test(source);
      assert.ok(inline || viaHelper, `${name}: reaches a no-repo stop`);
      // The claim is `{ stopped: "<理由>", why }`, so the second key is checked too. Without
      // this the row reads as covered while only half of it is.
      assert.match(
        source,
        /why:\s*[`"']/,
        `${name}: the stop carries why alongside stopped, as { stopped, why } states`,
      );
    }

    const globLines = ciNodeTestGlobs();
    assert.ok(globLines.length > 0, "Node tests step carries at least one quoted glob");

    const thisFileRelative = "skills/scribe/tests/structure-page.test.ts";
    assert.ok(
      globLines.some((glob) => globToRegExp(glob).test(thisFileRelative)),
      `Node tests glob covers ${thisFileRelative}`,
    );
  },
);
