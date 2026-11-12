// Tier 1 checks on write-body.ts: it writes the PR body from the block Claude Code stored in an
// agent transcript, and only a block whose body carries the digest the workflow asked for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { digest } from "../write-body.ts";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "write-body.ts");
const BODY = 'Closes #12\n\nのーと and ﾉｰﾄ give 0; `　pen　` trims; it\'s "quoted" $HOME \\ back\n';
const OTHER = "Closes #99\n\nanother run's body\n";

// The prompt as the harness stores it: a frame line, then every line of the computed text indented.
const prompt = (body: string) => {
  const lines = (Buffer.from(body, "utf8").toString("base64").match(/.{1,76}/g) ?? []).join("\n");
  const text = `Write the PR body.\n\`\`\`sh\nbase64 -d > '/w/pr.md' <<'PR_BODY_B64'\n${lines}\nPR_BODY_B64\n\`\`\`\n3. digest`;
  return `[Workflow harness — computed task]\n${text.replace(/^/gm, "  ")}`;
};
const userLine = (content: unknown) =>
  JSON.stringify({ type: "user", message: { role: "user", content } });
const assistantLine = JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "ok" }] } });

const project = () => {
  const projects = mkdtempSync(join(tmpdir(), "write-body-"));
  const agents = join(projects, "-abs-repo", "session-1", "subagents", "workflows", "wf_1");
  mkdirSync(agents, { recursive: true });
  return { projects, agents, out: join(projects, "pr.md") };
};
const transcript = (dir: string, id: string, lines: string[]) => {
  const path = join(dir, `agent-${id}.jsonl`);
  writeFileSync(path, `${lines.join("\n")}\n`);
  return path;
};
const run = (wanted: string, out: string, projects: string) => {
  try {
    const stdout = execFileSync("node", [script, wanted, out, projects], { encoding: "utf8" });
    return { code: 0, report: JSON.parse(stdout) };
  } catch (error) {
    const failed = error as { status: number; stdout: string };
    return { code: failed.status, report: JSON.parse(failed.stdout) };
  }
};

test("the body in a transcript's prompt is written byte for byte, whatever the harness indented", () => {
  const { projects, agents, out } = project();
  const path = transcript(agents, "a1", [userLine(prompt(BODY)), assistantLine]);
  const { code, report } = run(digest(BODY), out, projects);
  assert.equal(code, 0);
  assert.deepEqual(report, { ok: true, transcript: path });
  assert.equal(readFileSync(out, "utf8"), BODY);
});

test("a prompt stored as content parts is read the same way", () => {
  const { projects, agents, out } = project();
  transcript(agents, "a1", [userLine([{ type: "text", text: prompt(BODY) }])]);
  assert.equal(run(digest(BODY), out, projects).code, 0);
  assert.equal(readFileSync(out, "utf8"), BODY);
});

test("among several transcripts, the one whose block carries the wanted digest is taken", () => {
  const { projects, agents, out } = project();
  transcript(agents, "a1", [userLine(prompt(OTHER))]);
  const wanted = transcript(agents, "a2", [userLine(prompt(BODY))]);
  transcript(agents, "a3", [userLine("no block here"), "not json at all"]);
  const { code, report } = run(digest(BODY), out, projects);
  assert.equal(code, 0);
  assert.equal(report.transcript, wanted);
  assert.equal(readFileSync(out, "utf8"), BODY);
});

test("with no block of the wanted digest, nothing is written and the exit is 1", () => {
  const { projects, agents, out } = project();
  transcript(agents, "a1", [userLine(prompt(OTHER))]);
  const { code, report } = run(digest(BODY), out, projects);
  assert.equal(code, 1);
  assert.equal(report.ok, false);
  assert.ok(!existsSync(out));
});

test("a block an assistant message quotes is not taken as the prompt", () => {
  const { projects, agents, out } = project();
  transcript(agents, "a1", [
    JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: prompt(BODY) }] } }),
  ]);
  assert.equal(run(digest(BODY), out, projects).code, 1);
});

test("a transcript older than the scan window is left unread", () => {
  const { projects, agents, out } = project();
  const path = transcript(agents, "a1", [userLine(prompt(BODY))]);
  const old = new Date(Date.now() - 3 * 60 * 60 * 1000);
  utimesSync(path, old, old);
  assert.equal(run(digest(BODY), out, projects).code, 1);
});

test("a host with no projects directory, or a call without its arguments, exits 1", () => {
  const { projects, out } = project();
  assert.equal(run(digest(BODY), out, join(projects, "missing")).code, 1);
  assert.equal(run("", out, projects).code, 1);
});
