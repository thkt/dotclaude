/// <reference types="node" />
// In-process tests for skills/ablate/scripts/exposure.ts. Each transcript is built by hand as
// newline-delimited JSON, the shape --output-format stream-json writes; no claude process is
// started.
import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { classify_exposure } from "../scripts/exposure.ts";
import { fixture_relpath } from "../scripts/reference_arm.ts";

// A synthetic fixture cwd and repo root -- classify_exposure reads paths out of the transcript
// text alone, so neither needs to exist on disk.
const CWD = "/tmp/reference-arm-fixture-abc123";
const ROOT = "/repo";
const ELEMENT = "skills/use-context-reviewer-readability/references/ai-antipatterns.md";

/** One stream-json transcript line: a JSON object followed by a newline, the shape
 * `--output-format stream-json` writes one event per line. */
function line(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

/** An assistant event carrying one tool_use content block, the shape a stream-json transcript
 * holds a tool call in (docs.claude.com/en/docs/claude-code/headless#stream-responses: an
 * assistant event's message.content array holds Messages-API-shaped blocks). */
function assistantToolUse(name: string, input: Record<string, unknown>): Record<string, unknown> {
  return {
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "tool_use", id: `toolu_${name}`, name, input }],
    },
  };
}

test("T-502 A transcript carrying a Read of the fixture's target reference counts as exposed", () => {
  const transcript =
    line({ type: "system", subtype: "init" }) +
    line(assistantToolUse("Read", { file_path: join(CWD, fixture_relpath(ELEMENT)) })) +
    line({ type: "result", subtype: "success" });

  const result = classify_exposure(transcript, ELEMENT, CWD, ROOT);
  assert.equal(
    result.exposed,
    true,
    "expected a Read of the fixture's own copy of the target reference to count as exposed",
  );
});

test("T-503 A transcript with no Read of the fixture's target reference does not count as exposed", () => {
  // The run reads a sibling file of the same skill, inside the fixture, but never the target
  // reference itself.
  const siblingPath = join(CWD, fixture_relpath("skills/use-context-reviewer-readability/SKILL.md"));
  const transcript =
    line({ type: "system", subtype: "init" }) +
    line(assistantToolUse("Read", { file_path: siblingPath })) +
    line({ type: "result", subtype: "success" });

  const result = classify_exposure(transcript, ELEMENT, CWD, ROOT);
  assert.equal(
    result.exposed,
    false,
    "expected a run that never read the target reference to not count as exposed",
  );
});

test("T-504 A transcript whose tool call touches the real skill directory counts as contaminated even when it also read the fixture reference", () => {
  // Mirrors reviewer-readability.md's own fallback line: "read the same path under ~/.claude/
  // instead" when a ${CLAUDE_PLUGIN_ROOT} path is left unexpanded -- a real path under root,
  // outside the fixture at cwd.
  const realSkillPath = join(ROOT, "skills/use-context-reviewer-readability/SKILL.md");
  const transcript =
    line({ type: "system", subtype: "init" }) +
    line(assistantToolUse("Read", { file_path: join(CWD, fixture_relpath(ELEMENT)) })) +
    line(assistantToolUse("Read", { file_path: realSkillPath })) +
    line({ type: "result", subtype: "success" });

  const result = classify_exposure(transcript, ELEMENT, CWD, ROOT);
  assert.equal(result.exposed, true, "expected the fixture Read to still count as exposed");
  assert.equal(
    result.contaminated,
    true,
    "expected the Read of the real skill directory to count as contaminated",
  );

  // The same fallback reaches a Bash command as the unexpanded ~/.claude/ spelling.
  const home = "/home/reviewer";
  const tildeTranscript =
    line(assistantToolUse("Read", { file_path: join(CWD, fixture_relpath(ELEMENT)) })) +
    line(assistantToolUse("Bash", { command: "ugrep -n Examples ~/.claude/skills/" }));
  assert.equal(
    classify_exposure(tildeTranscript, ELEMENT, CWD, `${home}/.claude`, home).contaminated,
    true,
    "expected a Bash command naming ~/.claude/ to count as contaminated",
  );
});
