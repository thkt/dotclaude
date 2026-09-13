// Behavior tests for the Codex runner's pure seams: the strict-mode schema translation, its
// inverse, the agent-definition lookup, and the argv parse. The codex child process is never
// spawned here, so nothing in this file reaches the network.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createStubs,
  findSchemaViolation,
  loadAgent,
  MODEL_MAP,
  parseArgv,
  pruneNulls,
  strictify,
} from "../codex-run.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const TS_SCRIPT = join(HERE, "..", "codex-run.ts");

function withTempDir(fn) {
  const cwd = mkdtempSync(join(tmpdir(), "codex-run-cli-test-"));
  try {
    return fn(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

// isMainModule (workflows/_lib/entry-point.ts) resolves both argv[1] and the module path with
// realpathSync before comparing them, so a symlinked entrypoint still matches its real file and
// the CLI's usage branch (no workflow name, no --repo) runs instead of silently exiting 0.
test("T-050 the CLI invoked through a symlinked path to codex-run.ts with no arguments prints the usage line to stderr and exits 2", () => {
  withTempDir((cwd) => {
    const link = join(cwd, "codex-run-link.ts");
    symlinkSync(TS_SCRIPT, link);
    const result = spawnSync(process.execPath, [link], { encoding: "utf8" });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^usage: node workflows\/_lib\/codex-run\.ts <workflow> --repo/m);
  });
});

// The shape workflows/build.js's obj(required, properties) produces: required is a subset of
// properties on purpose, which is what OpenAI strict mode rejects.
const FETCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "body"],
  properties: {
    found: { type: "boolean" },
    body: { type: "string", description: "The issue body verbatim" },
    title: { type: "string", description: "The issue title verbatim" },
  },
};

test("strictify moves every declared property into required", () => {
  const out = strictify(FETCH_SCHEMA);
  assert.deepEqual(out.required, ["found", "body", "title"]);
  assert.equal(out.additionalProperties, false);
});

test("strictify makes a property outside the original required nullable", () => {
  const out = strictify(FETCH_SCHEMA);
  assert.deepEqual(out.properties.title.anyOf[1], { type: "null" });
  assert.equal(out.properties.body.type, "string");
});

test("strictify keeps an originally required property free of the null branch", () => {
  const out = strictify(FETCH_SCHEMA);
  assert.equal(out.properties.found.anyOf, undefined);
  assert.equal(out.properties.found.type, "boolean");
});

test("strictify descends into array items", () => {
  const schema = {
    type: "object",
    required: ["units"],
    properties: {
      units: {
        type: "array",
        items: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" }, note: { type: "string" } },
        },
      },
    },
  };
  const items = strictify(schema).properties.units.items;
  assert.deepEqual(items.required, ["id", "note"]);
  assert.deepEqual(items.note ?? items.properties.note.anyOf[1], { type: "null" });
});

test("strictify gives an object declared with no required list every key as nullable", () => {
  // build.js's reference_module is written this way: properties with no required list at all.
  const schema = {
    type: ["object", "null"],
    properties: { kind: { type: "string" }, reason: { type: "string" } },
  };
  const out = strictify(schema);
  const object = out.anyOf[0];
  assert.deepEqual(out.anyOf[1], { type: "null" });
  assert.deepEqual(object.required, ["kind", "reason"]);
  assert.equal(object.additionalProperties, false);
});

test("strictify adds additionalProperties false to an object that omitted it", () => {
  const out = strictify({ type: "object", properties: { a: { type: "string" } } });
  assert.equal(out.additionalProperties, false);
});

test("pruneNulls drops a null standing for a property the original left optional", () => {
  const value = pruneNulls({ found: true, body: "x", title: null }, FETCH_SCHEMA);
  assert.deepEqual(value, { found: true, body: "x" });
});

test("pruneNulls keeps a null under a property the original marked required", () => {
  const schema = {
    type: "object",
    required: ["reference_module"],
    properties: { reference_module: { type: ["object", "null"] } },
  };
  assert.deepEqual(pruneNulls({ reference_module: null }, schema), { reference_module: null });
});

test("pruneNulls descends into array items", () => {
  const schema = {
    type: "object",
    required: ["units"],
    properties: {
      units: {
        type: "array",
        items: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" }, note: { type: "string" } },
        },
      },
    },
  };
  const value = pruneNulls({ units: [{ id: "T-001", note: null }] }, schema);
  assert.deepEqual(value, { units: [{ id: "T-001" }] });
});

test("strictify and pruneNulls round-trip a response back to the shape the script expects", () => {
  const strict = strictify(FETCH_SCHEMA);
  // strict marks title nullable because FETCH_SCHEMA's own required list leaves it optional:
  // a compliant strict-mode response fills it with null, which pruneNulls must then drop
  // against the original schema to land back on the shape the script expects.
  assert.deepEqual(
    pruneNulls(
      { found: false, body: "", title: strict.properties.title.anyOf ? null : "unreachable" },
      FETCH_SCHEMA,
    ),
    { found: false, body: "" },
  );
});

// T-433: the test above calls itself a round trip but never reads what strictify returned, so
// it duplicates "pruneNulls drops a null standing for a property the original left optional"
// without proving the two functions compose. This pins that the round-trip test's own source
// captures strictify's return value and threads that same value into the pruneNulls call.
test("the round-trip check fails when strictify's output is discarded, which the current shape does not", () => {
  const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const marker =
    'test("strictify and pruneNulls round-trip a response back to the shape the script expects"';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, "the round-trip test is missing from this file");
  const bodyStart = source.indexOf("=> {", start) + "=> {".length;
  const bodyEnd = source.indexOf("\n});", bodyStart);
  const body = source.slice(bodyStart, bodyEnd);

  const captured = body.match(/const\s+(\w+)\s*=\s*strictify\(/);
  assert.ok(
    captured,
    "the round-trip test calls strictify but discards its return value instead of capturing it",
  );
  assert.ok(
    new RegExp(`pruneNulls\\([^;]*\\b${captured[1]}\\b`).test(body),
    `pruneNulls in the round-trip test never reads ${captured?.[1]}, so strictify's output still never reaches it`,
  );
});

test("loadAgent gives general-purpose no preamble and the write sandbox", () => {
  assert.deepEqual(loadAgent("general-purpose"), { preamble: "", readOnly: false });
});

test("loadAgent reads a reviewer definition and marks it read-only", () => {
  const loaded = loadAgent("reviewer-conformance");
  assert.equal(loaded.missing, undefined);
  assert.ok(loaded.preamble.length > 0);
  assert.equal(loaded.readOnly, true);
});

test("loadAgent reports a missing definition instead of throwing", () => {
  const loaded = loadAgent("reviewer-does-not-exist");
  assert.equal(loaded.missing, true);
  assert.equal(loaded.preamble, "");
});

test("MODEL_MAP names one Codex model per tier the workflow scripts use", () => {
  assert.ok(MODEL_MAP.haiku);
  assert.ok(MODEL_MAP.sonnet);
  assert.notEqual(MODEL_MAP.haiku, MODEL_MAP.sonnet);
});

test("parseArgv reads the workflow name and the repo as an absolute path", () => {
  const { name, args } = parseArgv(["build", "--repo", "/tmp/repo", "--issue", "123"]);
  assert.equal(name, "build");
  assert.equal(args.repo, "/tmp/repo");
  assert.equal(args.issue, "123");
});

test("parseArgv rejects a flag it does not define", () => {
  assert.throws(() => parseArgv(["build", "--repo", "/tmp/repo", "--nope", "1"]), /unknown flag/);
});

test("parseArgv leaves Object.prototype untouched when --args carries a __proto__ key", () => {
  const { args } = parseArgv([
    "build",
    "--repo",
    "/tmp/repo",
    "--args",
    '{"__proto__":{"polluted":1}}',
  ]);
  assert.equal({}.polluted, undefined);
  assert.equal(args.repo, "/tmp/repo");
});

// The unit shape build.js requires: files and tests are arrays the script reads .length from,
// so a null arriving there throws inside the vm instead of taking a degradation branch.
const UNIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["units"],
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "files"],
        properties: {
          id: { type: "string" },
          files: { type: "array", items: { type: "string" } },
          note: { type: "string" },
        },
      },
    },
  },
};

test("findSchemaViolation names a required array that came back null inside an item", () => {
  const found = findSchemaViolation({ units: [{ id: "T-001", files: null }] }, UNIT_SCHEMA);
  assert.equal(found, "units[0].files is null");
});

test("findSchemaViolation names a required key the response omitted", () => {
  const found = findSchemaViolation({ units: [{ files: [] }] }, UNIT_SCHEMA);
  assert.equal(found, "units[0].id is missing");
});

test("findSchemaViolation accepts null under a required property the schema declares nullable", () => {
  const schema = {
    type: "object",
    required: ["reference_module"],
    properties: {
      reference_module: { type: ["object", "null"], properties: { kind: { type: "string" } } },
    },
  };
  assert.equal(findSchemaViolation({ reference_module: null }, schema), "");
});

test("findSchemaViolation passes a response that fills every required field", () => {
  const value = { units: [{ id: "T-001", files: ["a.js"] }] };
  assert.equal(findSchemaViolation(value, UNIT_SCHEMA), "");
});

test("pruneNulls leaves a required null in place for findSchemaViolation to catch", () => {
  // The two run in sequence inside the agent stage: pruning removes the optional nulls, and
  // whatever null survives is the one that has to trigger a retry rather than reach the script.
  const pruned = pruneNulls({ units: [{ id: "T-001", files: null, note: null }] }, UNIT_SCHEMA);
  assert.deepEqual(pruned, { units: [{ id: "T-001", files: null }] });
  assert.equal(findSchemaViolation(pruned, UNIT_SCHEMA), "units[0].files is null");
});

test("stubs.workflow throws the message build.js's sibling() matches on an unresolved name", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "codex-run-test-"));
  try {
    const stubs = createStubs({ repo: "/tmp/repo", tmp });
    await assert.rejects(
      () => stubs.workflow("does-not-exist", {}),
      // build.js:159 tests the message for this exact substring before falling back to the
      // plugin namespace, so a reworded throw silently disables that fallback.
      (err) => err.message.includes("workflow('does-not-exist'): no workflow with that name"),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// T-434..T-437: createStubs's attempt loop (timeout / non-zero exit / missing output file /
// schema-violation retry / ATTEMPTS exceeded) pinned through an injectable `runOnce`, so these
// five paths are fixed without spawning the real codex binary. workflows/_lib/codex-run.ts does
// not wire runOnce into the loop yet (U-001's Green step), so stubs.agent() below still falls
// through to the real runCodexOnce -- PATH is blanked around that call so its spawn("codex", ...)
// fails fast via ENOENT instead of reaching a real process or the network.
async function withoutCodexOnPath(fn) {
  const original = process.env.PATH;
  process.env.PATH = "";
  try {
    return await fn();
  } finally {
    process.env.PATH = original;
  }
}

function withTempDirAsync(fn) {
  const tmp = mkdtempSync(join(tmpdir(), "codex-run-test-"));
  return fn(tmp).finally(() => rmSync(tmp, { recursive: true, force: true }));
}

const RUNONCE_SCHEMA = {
  type: "object",
  required: ["ok"],
  properties: { ok: { type: "boolean" } },
};

test("T-434 a timed-out codex run is retried once and the second answer is returned", () =>
  withTempDirAsync(async (tmp) => {
    const logs = [];
    const calls = [];
    const runOnce = async (spec) => {
      calls.push(spec);
      if (calls.length === 1) return { code: null, stderr: "", timedOut: true };
      writeFileSync(spec.outPath, "second answer");
      return { code: 0, stderr: "", timedOut: false };
    };
    const stubs = createStubs({ repo: "/tmp/does-not-exist", tmp, onLog: (m) => logs.push(m), runOnce });

    const result = await withoutCodexOnPath(() => stubs.agent("do the thing", { label: "t434" }));

    assert.equal(calls.length, 2, "runOnce should be consulted once per attempt");
    assert.equal(result, "second answer");
    assert.ok(logs.some((line) => line.includes("[t434] killed at")));
  }));

test("T-435 a non-zero codex exit logs the stderr tail and is retried without the schema correction", () =>
  withTempDirAsync(async (tmp) => {
    const logs = [];
    const calls = [];
    const runOnce = async (spec) => {
      calls.push(spec);
      if (calls.length === 1) {
        return { code: 2, stderr: "line1\nline2\nline3\nline4", timedOut: false };
      }
      writeFileSync(spec.outPath, "retried answer");
      return { code: 0, stderr: "", timedOut: false };
    };
    const stubs = createStubs({ repo: "/tmp/does-not-exist", tmp, onLog: (m) => logs.push(m), runOnce });

    const result = await withoutCodexOnPath(() => stubs.agent("do the thing", { label: "t435" }));

    assert.equal(calls.length, 2, "runOnce should be consulted once per attempt");
    assert.equal(result, "retried answer");
    assert.ok(logs.some((line) => line.includes("[t435] codex exited 2. line2 line3 line4")));
    assert.equal(calls[1]?.prompt, "do the thing", "the retry carries no schema correction");
  }));

test("T-436 a schema violation on the first answer is retried with the correction appended and the corrected answer is returned", () =>
  withTempDirAsync(async (tmp) => {
    const logs = [];
    const calls = [];
    const runOnce = async (spec) => {
      calls.push(spec);
      if (calls.length === 1) {
        writeFileSync(spec.outPath, JSON.stringify({}));
      } else {
        writeFileSync(spec.outPath, JSON.stringify({ ok: true }));
      }
      return { code: 0, stderr: "", timedOut: false };
    };
    const stubs = createStubs({ repo: "/tmp/does-not-exist", tmp, onLog: (m) => logs.push(m), runOnce });

    const result = await withoutCodexOnPath(() =>
      stubs.agent("do the thing", { label: "t436", schema: RUNONCE_SCHEMA }),
    );

    assert.equal(calls.length, 2, "runOnce should be consulted once per attempt");
    assert.deepEqual(result, { ok: true });
    assert.ok(calls[1]?.prompt.includes("did not fit the output schema"));
    assert.ok(logs.some((line) => line.includes("[t436] response did not fit the schema")));
  }));

test("T-437 two failed attempts return null and log each attempt", () =>
  withTempDirAsync(async (tmp) => {
    const logs = [];
    const calls = [];
    const runOnce = async (spec) => {
      calls.push(spec);
      // Attempt 1: codex exits 0 but writes no final message file.
      if (calls.length === 1) return { code: 0, stderr: "", timedOut: false };
      // Attempt 2: codex exits non-zero.
      return { code: 1, stderr: "boom", timedOut: false };
    };
    const stubs = createStubs({ repo: "/tmp/does-not-exist", tmp, onLog: (m) => logs.push(m), runOnce });

    const result = await withoutCodexOnPath(() => stubs.agent("do the thing", { label: "t437" }));

    assert.equal(calls.length, 2, "runOnce should be consulted once per attempt");
    assert.equal(result, null);
    assert.ok(logs.some((line) => line.includes("[t437] codex wrote no final message.")));
    assert.ok(logs.some((line) => line.includes("[t437] codex exited 1. boom")));
    assert.ok(
      logs.some((line) => line.includes("[t437] gave up after 2 attempts; the stage returns null.")),
    );
  }));
