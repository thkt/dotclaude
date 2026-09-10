/// <reference types="node" />
// Pins scribe_trigger.ts against the 14 observations hooks/_lib/tests/scribe_trigger_test.py
// drives for the Python original, consolidated into four scenarios (T-386 through T-389):
// find()'s trigger table (T-386, 6 of the Python file's TestFind observations), gh's absolute
// path plus its CLAUDE_GH_BIN override (T-387, new to this port since the Python side never
// swaps DEFAULT_GH under test), a missing or failing gh leaving shouldPrompt silent (T-388,
// TestGhBinary's 2 observations), and command_scan's lexing failure leaving find() silent
// rather than throwing (T-389, a TypeScript-side deviation from scribe_trigger.py's find, which
// lets that failure propagate to its own caller, hooks/post-bash/scribe_prompt.py -- this port
// has no such caller yet, so the module itself absorbs it instead).
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import test from "node:test";
import { DEFAULT_GH, find, type GhRunner, shouldPrompt } from "../scribe_trigger.ts";

/** A fake gh binary that hands back one queued response per call, in call order -- the same
 * shape hooks/_lib/tests/scribe-gate.test.ts's GH_STUB uses to drive shouldRun's real default
 * runner (a spawned child process) rather than an injected GhRunner. */
const GH_STUB = `#!/usr/bin/env python3
import os
import pathlib
import sys

responses = pathlib.Path(os.environ["GH_STUB_RESPONSES"]).read_text(encoding="utf-8").split("\\n")
index_path = pathlib.Path(os.environ["GH_STUB_INDEX"])
i = int(index_path.read_text()) if index_path.is_file() else 0
index_path.write_text(str(i + 1))
sys.stdout.write(responses[i])
`;

/** Writes the stub gh to its own temp directory, queues `responses` in call order, and points
 * the env vars it reads at that queue. Returns the stub's absolute path, the value a test hands
 * to CLAUDE_GH_BIN. */
function writeGhStub(responses: readonly string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "scribe-trigger-gh-stub-"));
  const bin = join(dir, "gh");
  writeFileSync(bin, GH_STUB, "utf-8");
  chmodSync(bin, 0o755);
  const responsesFile = join(dir, "responses");
  writeFileSync(responsesFile, responses.join("\n"), "utf-8");
  process.env.GH_STUB_RESPONSES = responsesFile;
  process.env.GH_STUB_INDEX = join(dir, "index");
  return bin;
}

function withWiki(): string {
  const dir = mkdtempSync(join(tmpdir(), "scribe-trigger-"));
  mkdirSync(join(dir, "docs", "wiki"), { recursive: true });
  return dir;
}

test("T-386 a command the trigger table names fires and one outside it does not", () => {
  const cwd = process.cwd();

  assert.equal(find("git pull"), cwd, "git pull");
  assert.equal(find("git pull origin main"), cwd, "git pull origin main");
  assert.equal(find('echo "git pull"'), null, "the word inside another command's argument");
  assert.equal(find("git push origin main"), null, "git push is not an ingest");
  assert.equal(
    find("cd ~/.claude && git pull"),
    join(homedir(), ".claude"),
    "a leading cd expands ~",
  );
  assert.equal(
    find("cd /path/to/repo; git pull"),
    "/path/to/repo",
    "a leading cd targets the pull's directory",
  );
});

test("T-387 gh is resolved from the absolute path, and CLAUDE_GH_BIN overrides it", () => {
  assert.equal(DEFAULT_GH, "/opt/homebrew/bin/gh");
  assert.ok(isAbsolute(DEFAULT_GH), "DEFAULT_GH must be an absolute path");

  const directory = withWiki();
  const stamp = join(directory, "cache", "claude-scribe_trigger.last");
  const ghBin = writeGhStub(["[]", "2026-01-01T00:00:00Z", '[{"number": 5}]']);

  const previous = process.env.CLAUDE_GH_BIN;
  process.env.CLAUDE_GH_BIN = ghBin;
  try {
    // No `gh` option and no `runner` option: the production path must resolve CLAUDE_GH_BIN
    // itself and spawn it, rather than falling back to a DEFAULT_GH this sandbox never installs.
    assert.equal(shouldPrompt(directory, { stamp }), true);
  } finally {
    if (previous === undefined) {
      delete process.env.CLAUDE_GH_BIN;
    } else {
      process.env.CLAUDE_GH_BIN = previous;
    }
  }
});

test("T-388 an absent gh binary leaves the trigger silent rather than failing", () => {
  const directory = withWiki();
  const stamp = join(directory, "cache", "claude-scribe_trigger.last");
  const missingGh = join(directory, "no-such-gh");

  assert.equal(
    shouldPrompt(directory, { stamp, gh: missingGh }),
    false,
    "a gh path that does not exist must not throw",
  );

  const failing: GhRunner = (args) => {
    throw new Error(`gh ${args.join(" ")} exited 4`);
  };
  assert.equal(
    shouldPrompt(directory, { stamp, runner: failing }),
    false,
    "a runner that throws (auth expiry, a network cut) must not propagate",
  );
});

test("T-389 a command whose lexing raises leaves the trigger silent", () => {
  // command_scan's lexer throws on an EOF inside an open quote; find() must absorb that rather
  // than let it out, the same silence should_prompt keeps for a broken gh call.
  assert.equal(find("echo 'unterminated"), null);
});
