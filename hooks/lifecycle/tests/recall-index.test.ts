/// <reference types="node" />
// Ports the retired Python hook test's five scenarios to recall_index.ts's side (unit U-003).
// The hook names recall by its full path, so the stub -- the same #!/bin/sh script the retired
// test used -- goes in through CLAUDE_RECALL_BIN, and HOME is swapped per fixture so the
// throttle stamp never touches this machine's own file. The Python file's five cases fold into
// T-243..T-246 here, pairing "skip vs. run" and "compact vs. startup" the way this plan's
// scenario names read each as one behavior.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "recall_index.ts");

// Same stub the retired Python test's STUB_BODY used: log every invocation's argv to $RECALL_LOG.
const STUB_BODY = '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$RECALL_LOG"\n';

interface Fixture {
  root: string;
  home: string;
  log: string;
  stub: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), "recall-index-tests-"));
  const home = path.join(root, "home");
  const stub = path.join(root, "recall");
  writeFileSync(stub, STUB_BODY);
  chmodSync(stub, 0o755);
  const log = path.join(root, "recall.log");
  writeFileSync(log, "");
  return { root, home, log, stub };
}

function stampPath(home: string): string {
  return path.join(home, ".cache", "claude-recall_index.last");
}

function runHook(f: Fixture, payload: string, recallBin?: string): string {
  return run(HOOK, payload, {
    ...process.env,
    HOME: f.home,
    RECALL_LOG: f.log,
    CLAUDE_RECALL_BIN: recallBin ?? f.stub,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The hook detaches recall, so the log needs the job to land before it is read -- mirrors
// the retired Python test's run_hook polling loop.
// The hook spawns recall detached and unrefs it, so the stub writes its log on the operating
// system's schedule rather than this test's. One second was not enough under a full parallel
// suite run: the wait timed out roughly one run in three while the stub was merely late, never
// absent. The loop returns the moment the log has content, so a longer bound costs the passing
// path nothing and only buys the loaded machine room.
const LOG_WAIT_ATTEMPTS = 200;
const LOG_WAIT_INTERVAL_MS = 50;

async function waitForLog(logPath: string): Promise<string> {
  for (let attempt = 0; attempt < LOG_WAIT_ATTEMPTS; attempt += 1) {
    const text = readFileSync(logPath, "utf8");
    if (text) return text;
    await sleep(LOG_WAIT_INTERVAL_MS);
  }
  return readFileSync(logPath, "utf8");
}

test("T-243 with no stamp on file the hook runs recall index and writes the stamp under the temp HOME", async () => {
  const f = fixture();
  runHook(f, "{}");
  const logged = await waitForLog(f.log);
  assert.match(logged, /index/, "recall must have been invoked with the index argument");
  assert.ok(
    statSync(stampPath(f.home), { throwIfNoEntry: false })?.isFile(),
    "no stamp written",
  );
});

test("T-244 a stamp newer than the window skips the run and a stamp from 2020 lets it run", async () => {
  const f = fixture();
  const stamp = stampPath(f.home);
  mkdirSync(path.dirname(stamp), { recursive: true });
  writeFileSync(stamp, "");

  runHook(f, "{}");
  await sleep(100);
  assert.equal(readFileSync(f.log, "utf8"), "", "a fresh stamp must skip the run");

  const old = new Date(2020, 0, 1);
  utimesSync(stamp, old, old);
  runHook(f, "{}");
  const logged = await waitForLog(f.log);
  assert.match(logged, /index/, "a stamp from 2020 must let the run happen");
});

test("T-245 a compact source skips the run without writing a stamp while a startup source runs it", async () => {
  const f = fixture();

  runHook(f, '{"source":"compact"}');
  await sleep(100);
  assert.equal(readFileSync(f.log, "utf8"), "", "a compact restart must not run recall");
  assert.equal(
    statSync(stampPath(f.home), { throwIfNoEntry: false }),
    undefined,
    "a compact restart must not write a stamp",
  );

  runHook(f, '{"source":"startup"}');
  const logged = await waitForLog(f.log);
  assert.match(logged, /index/, "a startup source must run recall");
});

test("T-246 an absent recall binary produces no output and no run, and a closed stdin is read as an empty payload with exit 0", () => {
  const f = fixture();

  const stdout = runHook(f, "{}", path.join(f.root, "absent-recall"));
  assert.equal(stdout, "", "the hook must print nothing when recall is absent");
  assert.equal(
    readFileSync(f.log, "utf8"),
    "",
    "recall must not have run when the binary is absent",
  );

  const result = spawnSync(process.execPath, [HOOK], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: { ...process.env, HOME: f.home, RECALL_LOG: f.log, CLAUDE_RECALL_BIN: f.stub },
  });
  assert.equal(result.status, 0, `closed stdin must still exit 0 (stderr: ${result.stderr})`);
});
