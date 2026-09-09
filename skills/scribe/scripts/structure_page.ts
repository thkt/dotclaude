/// <reference types="node" />
// Reads docs/wiki's `kind: structure` pages and the claims their sections carry.
//
// docs/wiki/README.md fixes the section order for a structure page:
// `内容` → `境界` → `契約` → `要求` → `参照コード` → `由来`. The first, fifth and sixth are bullet
// lists; `契約` and `要求` are tables. A table's header row and its `---` separator row are
// formatting, not a claim, so they are excluded.
//
// TypeScript port of skills/scribe/scripts/structure_page.py, mirroring
// skills/scribe/scripts/find_wiki_rule.ts's own header. Carries SECTIONS / findStructurePages /
// readClaims, in node:* only. Not a CLI: nothing runs it from a shell (the Python original
// carries no argv handling either), so it has neither a shebang nor an
// isMainModule(import.meta.url) entry point, and its git index mode stays 100644.
//
// Contract: skills/scribe/scripts/structure_page.py's own behavior. Exercised by
// skills/scribe/tests/structure-page.test.ts.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// The frontmatter value docs/wiki/README.md names as the marker of a structure page, as
// opposed to a `共通項` page.
const KIND_LINE = "kind: structure";

// The fixed order docs/wiki/README.md gives a structure page's sections.
export const SECTIONS = ["内容", "境界", "契約", "要求", "参照コード", "由来"] as const;

// The lines between the opening and closing `---` delimiters, found by scanning to the
// closing delimiter rather than assuming a fixed position.
function frontmatterLines(pagePath: string): string[] {
  const lines = readFileSync(pagePath, "utf8").split("\n");
  if (lines.length === 0 || lines[0] !== "---") return [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return lines.slice(1, i);
  }
  return [];
}

// Every page under wikiDir whose frontmatter carries `kind: structure`.
export function findStructurePages(wikiDir: string): string[] {
  return readdirSync(wikiDir)
    .filter((name) => name.endsWith(".md"))
    .filter((name) => frontmatterLines(join(wikiDir, name)).includes(KIND_LINE))
    .sort()
    .map((name) => join(wikiDir, name));
}

// The lines of one `## heading` section, up to the next `## ` heading or the end.
function sectionBody(text: string, heading: string): string {
  const marker = `\n## ${heading}\n`;
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return "";
  const body = text.slice(markerIndex + marker.length);
  const nextHeading = body.indexOf("\n## ");
  return nextHeading === -1 ? body : body.slice(0, nextHeading);
}

// The claim lines a section body carries, in the section's own format.
//
// A table section's rows start with `|`: the first two (header, `---` separator) are
// formatting, so only the rows after them are claims. A bullet section's rows start with
// `- `. A prose section (`内容`) has neither, so every non-empty line is a claim.
function sectionClaims(body: string): string[] {
  const lines = body.split("\n");
  const tableRows = lines.filter((line) => line.startsWith("|"));
  if (tableRows.length >= 2) return tableRows.slice(2);
  const bullets = lines.filter((line) => line.startsWith("- "));
  if (bullets.length > 0) return bullets;
  return lines.filter((line) => line.trim() !== "");
}

// The claims each of a structure page's six sections carries, keyed by section name.
export function readClaims(pagePath: string): Record<string, string[]> {
  const text = readFileSync(pagePath, "utf8");
  const result: Record<string, string[]> = {};
  for (const section of SECTIONS) {
    result[section] = sectionClaims(sectionBody(text, section));
  }
  return result;
}
