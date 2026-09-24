import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { OUTCOME_WORDS } from "../scripts/prompt-log.ts";

// Contract tests for skills/pr/SKILL.md's prompt-log integration (issue #727 U-003). Phase 3
// gains one step, after PR creation, that runs scripts/prompt-log.ts's render and check
// subcommands and confirms the attachment through AskUserQuestion before
// `gh pr edit <number> --attach <path>` runs. SKILL.md carries only the invocation and a
// pointer to references/prompt-log.md, which carries the procedure (the Pageshot Integration
// "call -> branch on the result line" shape). The Outcome vocabulary named there is read from
// the script's own OUTCOME_WORDS export rather than restated by hand, so the two cannot drift.

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

type Lang = "en" | "ja";

function at(lang: Lang, ...parts: string[]): string {
  return join(root, ...(lang === "ja" ? [".ja"] : []), ...parts);
}

function read(path: string): string {
  assert.ok(existsSync(path), `${path} exists`);
  return readFileSync(path, "utf8");
}

const skill = (lang: Lang): string => read(at(lang, "skills", "pr", "SKILL.md"));
const reference = (lang: Lang): string =>
  read(at(lang, "skills", "pr", "references", "prompt-log.md"));

const scriptSource = readFileSync(join(root, "skills", "pr", "scripts", "prompt-log.ts"), "utf8");

/** Every subcommand name the script's own `// Usage: prompt-log.ts <subcommand> ...` header
 * lines carry (`render`, `check`), read from the source rather than hardcoded, so a subcommand
 * added or renamed on the script side is what this test follows, not a copy of today's pair. */
function usageSubcommands(source: string): string[] {
  const header = source
    .split("\n")
    .filter((line) => line.startsWith("//"))
    .join("\n");
  return [...header.matchAll(/prompt-log\.ts (\w+)/g)].map((match) => match[1]);
}

test("T-528 skills/pr/SKILL.md names the prompt-log script with the render and check subcommands its usage header carries, and allowed-tools grants Bash(node:*) and AskUserQuestion", () => {
  const doc = skill("en");
  const subcommands = usageSubcommands(scriptSource);
  assert.ok(
    subcommands.length >= 2,
    `the script's usage header carries at least two subcommands (found: ${JSON.stringify(subcommands)})`,
  );
  assert.match(doc, /scripts\/prompt-log\.ts/, "SKILL.md names the script by path");
  for (const subcommand of subcommands) {
    assert.match(
      doc,
      new RegExp(`\\b${subcommand}\\b`),
      `SKILL.md names the ${subcommand} subcommand`,
    );
  }
  const tools = doc.match(/^allowed-tools: (.+)$/m)?.[1] ?? "";
  assert.match(tools, /Bash\(node:\*\)/, `allowed-tools grants Bash(node:*) (actual: ${tools})`);
  assert.match(tools, /AskUserQuestion/, `allowed-tools grants AskUserQuestion (actual: ${tools})`);
});

test("T-529 skills/pr/SKILL.md and its .ja mirror both point at references/prompt-log.md, and that reference names every word of the script's exported Outcome vocabulary", () => {
  for (const lang of ["en", "ja"] as const) {
    const doc = skill(lang);
    assert.match(
      doc,
      /references\/prompt-log\.md/,
      `${lang}: SKILL.md points at references/prompt-log.md`,
    );
    const ref = reference(lang);
    for (const word of OUTCOME_WORDS) {
      assert.ok(
        ref.includes(word),
        `${lang}: references/prompt-log.md names the Outcome word "${word}"`,
      );
    }
  }
});
