/// <reference types="node" />
import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../../_lib/tests/_hook-harness.ts";
import { sessionId } from "../amphetamine_state.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "..", "amphetamine_agent_session.ts");

const NO_SESSION = "-3";

const STUB_OSASCRIPT = [
  "#!/bin/sh",
  'printf \'%s\\n\' "$*" >> "$OSASCRIPT_LOG"',
  'case "$*" in',
  '  *"session time remaining"*) printf \'%s\\n\' "${STUB_REMAINING:--3}" ;;',
  "esac",
  "exit 0",
].join("\n");

interface Fixture {
  binDir: string;
  app: string;
  stateDir: string;
  log: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), "amphetamine-argv-tests-"));
  const binDir = path.join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const stub = path.join(binDir, "osascript");
  writeFileSync(stub, `${STUB_OSASCRIPT}\n`);
  chmodSync(stub, 0o755);

  const app = path.join(root, "Amphetamine.app");
  mkdirSync(app, { recursive: true });
  const log = path.join(root, "osascript.log");
  writeFileSync(log, "");

  return { binDir, app, stateDir: path.join(root, "state"), log };
}

function runHook(
  f: Fixture,
  action: string,
  payload: Record<string, unknown>,
  remaining: string = NO_SESSION,
): string {
  return run(
    HOOK,
    payload,
    {
      ...process.env,
      PATH: `${f.binDir}${path.delimiter}${process.env.PATH}`,
      OSASCRIPT_LOG: f.log,
      STUB_REMAINING: remaining,
      CLAUDE_AMPHETAMINE_APP: f.app,
      CLAUDE_AMPHETAMINE_STATE_DIR: f.stateDir,
    },
    [action],
  );
}

function sent(f: Fixture): string {
  return readFileSync(f.log, "utf8");
}

function markers(f: Fixture, prefix = "session-"): string[] {
  try {
    return readdirSync(f.stateDir)
      .filter((name) => name.startsWith(prefix))
      .sort();
  } catch {
    return [];
  }
}

test("T-396 acquire with no session running starts one and leaves one marker, release of the last reference ends it and clears the marker, and a subagent's background call reissues it with a bg marker", () => {
  const f = fixture();

  runHook(f, "acquire", { session_id: "session-a" });
  assert.match(
    sent(f),
    /start new session/,
    "acquire with no session running must send start new session, argv[1]=acquire",
  );
  assert.deepEqual(markers(f), ["session-session-a"], "acquire must leave exactly one marker");

  writeFileSync(f.log, "");
  runHook(f, "release", { session_id: "session-a" }, "1800");
  assert.match(
    sent(f),
    /end session/,
    "release closing the last reference must send end session, argv[1]=release",
  );
  assert.deepEqual(markers(f), [], "release must clear the marker it closed");

  writeFileSync(f.log, "");
  runHook(f, "background", { session_id: "session-b", agent_id: "agent-1" });
  assert.match(
    sent(f),
    /start new session/,
    "background from a subagent must send start new session, argv[1]=background",
  );
  assert.deepEqual(markers(f, "bg-"), ["bg-session-b"], "background must leave one bg marker");
});

test("T-397 a background call from a subagent is honoured and one from the main session is not", () => {
  const f = fixture();

  assert.equal(
    sessionId(JSON.stringify({ session_id: "session-a", agent_id: "agent-1" }), "background"),
    "session-a",
    "session_id must honor a background call carrying an agent_id",
  );
  assert.equal(
    sessionId(JSON.stringify({ session_id: "session-a", tool_name: "Bash" }), "background"),
    null,
    "session_id must not honor a background call from the main session (no agent_id, no Workflow/Agent tool_name)",
  );

  runHook(f, "background", { session_id: "session-a", agent_id: "agent-1", tool_name: "Bash" });
  assert.match(sent(f), /start new session/, "a subagent background call must reach osascript");
  assert.deepEqual(markers(f, "bg-"), ["bg-session-a"], "a subagent background call must leave a bg marker");

  writeFileSync(f.log, "");
  runHook(f, "background", { session_id: "session-c", tool_name: "Bash" });
  assert.equal(sent(f), "", "a main-session background call must send nothing to osascript");
  assert.deepEqual(markers(f, "bg-"), ["bg-session-a"], "a main-session background call must leave no new bg marker");
});

test("T-398 an unknown action exits silently", () => {
  const f = fixture();

  runHook(f, "status", { session_id: "session-a" });
  assert.equal(sent(f), "", "an action other than acquire/release/background must send nothing");
  assert.deepEqual(markers(f), [], "an unknown action must leave no marker");
});

test("T-399 a repeated background call inside the throttle window returns early without touching the marker", () => {
  const f = fixture();

  runHook(f, "background", { session_id: "session-a", agent_id: "agent-1" });
  const markerPath = path.join(f.stateDir, "bg-session-a");
  const firstStamp = statSync(markerPath).mtimeMs;

  writeFileSync(f.log, "");
  runHook(f, "background", { session_id: "session-a", agent_id: "agent-1" });
  assert.equal(sent(f), "", "a background call inside the throttle window must send nothing to osascript");
  assert.equal(
    statSync(markerPath).mtimeMs,
    firstStamp,
    "a throttled background call must not touch the bg marker's mtime",
  );
});

test("a machine without the app gets no marker, no sweep and no osascript", () => {
  const f = fixture();
  const missing = path.join(path.dirname(f.stateDir), "no-such-app.app");

  const out = run(
    HOOK,
    { session_id: "s1" },
    {
      ...process.env,
      PATH: `${f.binDir}${path.delimiter}${process.env.PATH}`,
      OSASCRIPT_LOG: f.log,
      STUB_REMAINING: NO_SESSION,
      CLAUDE_AMPHETAMINE_APP: missing,
      CLAUDE_AMPHETAMINE_STATE_DIR: f.stateDir,
    },
    ["acquire"],
  );

  assert.equal(out, "", "the hook must stay silent");
  assert.equal(sent(f), "", "no osascript command must be sent");
  assert.equal(existsSync(f.stateDir), false, "the state directory must not be created");
});

test("a PATH with no osascript gets no marker and no sweep", () => {
  const f = fixture();

  const out = run(
    HOOK,
    { session_id: "s1" },
    {
      ...process.env,
      PATH: "",
      OSASCRIPT_LOG: f.log,
      STUB_REMAINING: NO_SESSION,
      CLAUDE_AMPHETAMINE_APP: f.app,
      CLAUDE_AMPHETAMINE_STATE_DIR: f.stateDir,
    },
    ["acquire"],
  );

  assert.equal(out, "", "the hook must stay silent");
  assert.equal(existsSync(f.stateDir), false, "the state directory must not be created");
});
