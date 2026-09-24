import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCli, withTempHome } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { OUTCOME_WORDS } from "../scripts/prompt-log.ts";

// Behavior tests for skills/pr/scripts/prompt-log.ts's `check` subcommand and for `render`'s
// transcript resolution once a session id can collide across project directories (issue #727
// U-002). `check` follows skills/issue/scripts/validate-issue-body.ts's { errors, warnings,
// checks } stdout-JSON / exit-0-1 contract; OUTCOME_WORDS is the one export naming the
// vocabulary an `Outcome:` line has to start with. The two `render` scenarios seed
// .claude/projects/<dir>/<sessionId>.jsonl the same way prompt-log-render.test.ts does.

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "prompt-log.ts");

/** One prompt block in the shape `render` writes: a numbered heading, a fenced prompt, and an
 * `Outcome:` line. An empty `outcome` reproduces render's own bare `Outcome:` line. */
function promptBlock(index: number, outcome: string): string {
  const outcomeLine = outcome === "" ? "Outcome:" : `Outcome: ${outcome}`;
  return `### ${index}. 2026-01-01T00:00:0${index}.000Z\n\n\`\`\`\nprompt text ${index}\n\`\`\`\n\n${outcomeLine}\n`;
}

/** Writes a prompt-log Markdown file carrying `blocks` under render's own header shape, always
 * at the same path so a test can rewrite it mid-scenario and re-run `check` against it. */
function writePromptLog(home: string, blocks: readonly string[]): string {
  const path = join(home, "prompt-log.md");
  const header = [
    "# Session test-session",
    "",
    "Every prompt sent in this session; may include work beyond this PR.",
    "",
  ];
  writeFileSync(path, `${[...header, ...blocks].join("\n")}\n`);
  return path;
}

test("T-524 check exits 1 naming every block whose Outcome line is empty or starts with a word outside the exported vocabulary, and exits 0 once every line starts with one of them", () => {
  withTempHome((home) => {
    const path = writePromptLog(home, [
      promptBlock(1, ""),
      promptBlock(2, "bogus-word is not vocabulary"),
    ]);
    const bad = runCli(SCRIPT, home, "", ["check", path]);
    assert.equal(bad.status, 1, `exit code (stderr: ${bad.stderr})`);
    const badResult = JSON.parse(bad.stdout) as { errors: string[] };
    assert.ok(
      badResult.errors.some((e) => e.includes("1")),
      `block 1's empty Outcome line is named (errors: ${JSON.stringify(badResult.errors)})`,
    );
    assert.ok(
      badResult.errors.some((e) => e.includes("2")),
      `block 2's out-of-vocabulary Outcome line is named (errors: ${JSON.stringify(badResult.errors)})`,
    );

    writePromptLog(home, [
      promptBlock(1, `${OUTCOME_WORDS[0]} because it landed`),
      promptBlock(2, `${OUTCOME_WORDS[1]} because it did not land`),
    ]);
    const good = runCli(SCRIPT, home, "", ["check", path]);
    assert.equal(
      good.status,
      0,
      `exit code once every Outcome line starts with a vocabulary word (stderr: ${good.stderr})`,
    );
    const goodResult = JSON.parse(good.stdout) as { errors: string[] };
    assert.equal(
      goodResult.errors.length,
      0,
      `no error remains (errors: ${JSON.stringify(goodResult.errors)})`,
    );
  });
});

test("T-525 check exits 1 when the file holds no prompt block, and exits 0 for the same file with one filled block appended", () => {
  withTempHome((home) => {
    const path = writePromptLog(home, []);
    const empty = runCli(SCRIPT, home, "", ["check", path]);
    assert.equal(empty.status, 1, `exit code with no prompt block (stderr: ${empty.stderr})`);
    const emptyResult = JSON.parse(empty.stdout) as { errors: string[] };
    assert.ok(
      emptyResult.errors.length > 0,
      `a file with no prompt block is faulted (errors: ${JSON.stringify(emptyResult.errors)})`,
    );

    writePromptLog(home, [promptBlock(1, `${OUTCOME_WORDS[2]} because it did not apply`)]);
    const filled = runCli(SCRIPT, home, "", ["check", path]);
    assert.equal(
      filled.status,
      0,
      `exit code once one filled block exists (stderr: ${filled.stderr})`,
    );
  });
});

/** Writes `content` as `.claude/projects/<projectDirName>/[extraSubdir/]<sessionId>.jsonl`
 * under `home`, standing in for a real session transcript at, or below, a project directory. */
function seedTranscript(
  home: string,
  projectDirName: string,
  sessionId: string,
  content: string,
  extraSubdir?: string,
): string {
  const dir = extraSubdir
    ? join(home, ".claude", "projects", projectDirName, extraSubdir)
    : join(home, ".claude", "projects", projectDirName);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${sessionId}.jsonl`);
  writeFileSync(path, `${content}\n`);
  return path;
}

const humanEntry = (content: string, timestamp: string): string =>
  JSON.stringify({
    type: "user",
    message: { role: "user", content },
    origin: { kind: "human" },
    timestamp,
  });

test("T-526 render resolves the transcript from the immediate children of projects/*/ only, ignoring a same-named file nested deeper", () => {
  withTempHome((home) => {
    const sessionId = "66666666-6666-6666-6666-666666666666";
    seedTranscript(
      home,
      "proj-a",
      sessionId,
      humanEntry("immediate child prompt", "2026-01-01T00:00:00.000Z"),
    );
    seedTranscript(
      home,
      "proj-a",
      sessionId,
      humanEntry("nested decoy prompt", "2026-01-01T00:00:01.000Z"),
      "nested",
    );
    const outPath = join(home, "out.md");
    const run = runCli(SCRIPT, home, "", ["render", sessionId, "--out", outPath]);
    assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
    const markdown = readFileSync(outPath, "utf8");
    assert.match(markdown, /immediate child prompt/, "the immediate child's prompt is rendered");
    assert.doesNotMatch(markdown, /nested decoy prompt/, "the nested file's prompt is never read");
  });
});

test("T-527 render exits 1 naming both paths when two project directories hold the same session file", () => {
  withTempHome((home) => {
    const sessionId = "77777777-7777-7777-7777-777777777777";
    const pathA = seedTranscript(
      home,
      "proj-a",
      sessionId,
      humanEntry("prompt in proj-a", "2026-01-01T00:00:00.000Z"),
    );
    const pathB = seedTranscript(
      home,
      "proj-b",
      sessionId,
      humanEntry("prompt in proj-b", "2026-01-01T00:00:01.000Z"),
    );
    const outPath = join(home, "out.md");
    const run = runCli(SCRIPT, home, "", ["render", sessionId, "--out", outPath]);
    assert.equal(run.status, 1, `exit code on an ambiguous session id (stderr: ${run.stderr})`);
    assert.ok(run.stderr.includes(pathA), `stderr names ${pathA} (stderr: ${run.stderr})`);
    assert.ok(run.stderr.includes(pathB), `stderr names ${pathB} (stderr: ${run.stderr})`);
  });
});
