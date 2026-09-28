// Behavior checks on implement.js with every agent stubbed. They pin what the script decides on
// its own: the stop reasons, the review contract (finding IDs, target identity, host-computed
// status), the unbounded repair loop, the deterministic branch name, the publication gates, the
// CI classification, and the run rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "../../_lib/run-workflow.ts";

const implementJs = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "implement.js");
const repo = "/abs/target-repo";
// The verification-loop tests stop at verified_local; publishArgs takes the default publish path.
const args = { issue: "12", repo, publish: false };
const publishArgs = { issue: "12", repo };
const BASE_SHA = "a".repeat(40);
const treeOf = (n) => String(n).padStart(40, "0");
const RUN_ID = "0123456789abcdef0123456789abcdef";
const DIGEST = "c".repeat(64);
const COMMIT = "e".repeat(40);
const PR_URL = "https://github.com/o/r/pull/34";
const PUSH_URL = "https://github.com/o/r.git";
const BRANCH = "fix/12-fix-login-crash-on";
// Revision: the head the earlier run published, its body's sha256, and the row that run wrote.
const PUBLISHED = "5".repeat(40);
const START_BODY_SHA = "6".repeat(64);
const PR_FIELDS = {
  state: "open",
  draft: true,
  html_url: PR_URL,
  user: "thkt",
  head_sha: PUBLISHED,
  head_ref: BRANCH,
  head_repo: "o/r",
  base_ref: "main",
  base_repo: "o/r",
};
const ROW = {
  reason: "published_draft",
  url: PR_URL,
  commit: PUBLISHED,
  base_sha: BASE_SHA,
  branch: BRANCH,
  issue: "12",
  repo,
};

const ISSUE = {
  number: 12,
  title: "[Bug] Fix login crash on Safari",
  body: "Done when: login works on Safari.",
  state: "OPEN",
  url: "https://github.com/o/r/issues/12",
};
const CONFIG = {
  repository: "o/r",
  remote: "origin",
  baseBranch: "main",
  setup: [],
  check: ["bun", "run", "check"],
  ciChecks: ["tests"],
  capture: null,
};

const assessments = {
  code: "c",
  requirements: "r",
  tests: "t",
  documentation: "d",
};
const reviewReply = (targetId, { updates = [], newItems = [] } = {}) => ({
  findings: "summary",
  targetId,
  assessments,
  updates,
  newItems,
  documents: [],
  handoff: [],
});
const finding = (overrides = {}) => ({
  kind: "defect",
  area: "code",
  required: true,
  location: { path: "src/login.js", line: 3 },
  condition: "cond",
  impact: "impact",
  evidence: "evidence",
  action: "action",
  reason: "reason",
  ...overrides,
});

// Classifies an agent call by its schema's properties rather than its label or wording. The first
// property found decides, so a schema sharing a later property (tree, exit_code) is caught earlier.
const CONFIG_BLOB = "b".repeat(40);
const FILLED = {
  target: {
    head_sha: BASE_SHA,
    report_listing: "",
    revision_pr: "",
    revision_body_sha: "",
    revision_row: "",
  },
  prepare: { config_blob: CONFIG_BLOB, checkout_head: BASE_SHA },
  snapshot: { config_blob: CONFIG_BLOB },
};
const KIND_BY_PROPERTY = [
  ["run_id", "record"],
  ["listing", "documents"],
  ["wt_status", "reprepare"],
  ["pr_fields", "revision"],
  ["undo_exit", "undo"],
  ["edit_exit", "edit"],
  ["pulls_json", "pulls"],
  ["parent", "commit"],
  ["body_digest", "body"],
  ["effective_url", "probe"],
  ["remote_sha", "push"],
  ["create_exit", "create"],
  ["pr_json", "readback"],
  ["attach_exit", "attach"],
  ["view_json", "ci"],
  ["config_found", "target"],
  ["setup_exits", "prepare"],
  ["timed_out", "capture"],
  ["raw", "diff"],
  ["stdout", "install"],
  ["exit_code", "check"],
  ["issue_digest", "snapshot"],
  ["newItems", "review"],
  ["description", "name"],
];
const kindOf = (opts) => {
  const p = (opts.schema && opts.schema.properties) || {};
  const found = KIND_BY_PROPERTY.find(([property]) => property in p);
  if (found) return found[1];
  if ("status" in p) return opts.label === "implement" ? "implement" : "repair";
  throw new Error(`unclassified agent call: ${opts.label}`);
};

// Each kind answers from a queue when one is given, else from its default. The check queue and
// the review queue drive the loop; the rest default to the happy path.
const makeStubs = (overrides = {}) => {
  const queues = Object.fromEntries(
    Object.entries(overrides).map(([kind, v]) => [kind, Array.isArray(v) ? [...v] : v]),
  );
  const rows = [];
  let tree = treeOf(1);
  // The body the script asked the body agent to write, echoed back by the readback and CI views.
  const published = { body: "" };
  const defaults = {
    record: (prompt) => {
      rows.push(JSON.parse(prompt.slice(prompt.lastIndexOf("\n") + 1)));
      return { path: "/h/implement-runs.jsonl", run_id: RUN_ID };
    },
    target: makeStubsTarget,
    prepare: () => ({
      existing: false,
      created: true,
      base_sha: BASE_SHA,
      setup_exits: [],
      setup_tail: "",
    }),
    snapshot: () => ({
      issue_digest: DIGEST,
      tree,
    }),
    check: () => ({ exit_code: 0, log_tail: "ok", tree }),
    diff: () => ({ exit_code: 0, raw: ":100644 100644 aaa bbb M\tsrc/app.js\n" }),
    capture: () => ({ started: true, timed_out: false, exit_code: 0, log_tail: "", tree }),
    // Installing media changes the worktree, so the check and review that follow see a new tree.
    install: () => {
      tree = treeOf(Number.parseInt(tree, 10) + 500);
      return {
        stdout: JSON.stringify({
          ok: true,
          files: [{ name: "list.png", size: 20, sha256: "d".repeat(64) }],
        }),
        tree,
      };
    },
    review: () => reviewReply(tree),
    implement: () => ({ status: "repaired", findings: "implemented" }),
    repair: () => {
      tree = treeOf(Number.parseInt(tree, 10) + 1);
      return { status: "repaired", findings: "repaired" };
    },
    // git ls-tree over the reviewed tree for the documents a review named: every path is a blob.
    documents: (prompt) => ({
      exit_code: 0,
      listing: listedPaths(prompt)
        .map((p) => `100644 blob ${"d".repeat(40)}\t${p}`)
        .join("\n"),
    }),
    // Revision: the earlier worktree is reused clean at the published head.
    reprepare: () => ({
      existing: true,
      created: false,
      wt_status: "",
      wt_branch: BRANCH,
      head: PUBLISHED,
      config_blob: CONFIG_BLOB,
      base_config_blob: CONFIG_BLOB,
      setup_exits: [],
      setup_tail: "",
    }),
    revision: () => ({ pr_fields: JSON.stringify(PR_FIELDS), body_sha: START_BODY_SHA }),
    undo: () => ({ undo_exit: 0, is_draft: true }),
    edit: () => ({ edit_exit: 0, edit_tail: "" }),
    pulls: () => ({ actor: "thkt", pulls_exit: 0, pulls_json: "[[]]" }),
    commit: () => ({
      commit_exit: 0,
      commit: COMMIT,
      parent: BASE_SHA,
      tree,
      files: "src/login.js\n",
    }),
    body: (prompt) => {
      published.body = bodyIn(prompt);
      return { write_exit: 0, body_digest: digestOf(published.body) };
    },
    probe: () => ({ push_url: PUSH_URL, effective_url: PUSH_URL }),
    push: () => ({ push_exit: 0, push_tail: "", remote_sha: COMMIT }),
    create: () => ({ create_exit: 0, url: PR_URL, create_tail: "" }),
    readback: () => ({ readback_exit: 0, pr_json: JSON.stringify(restPr(published.body)) }),
    attach: () => ({ attach_exit: 0, attach_tail: "" }),
    ci: () => ({ view_exit: 0, view_json: JSON.stringify(ciView(published.body)) }),
  };
  const agent = async (prompt, opts) => {
    const kind = kindOf(opts);
    const queued = queues[kind];
    // A queue answers in order and then falls back to the default; a bare function answers every call.
    const answer = Array.isArray(queued)
      ? queued.length
        ? queued.shift()
        : defaults[kind]
      : (queued ?? defaults[kind]);
    const value =
      typeof answer === "function"
        ? answer(prompt, { tree, label: opts.label, body: published.body })
        : answer;
    // Fields a test rarely varies default here, so an override names only what it changes.
    return value && typeof value === "object" && FILLED[kind]
      ? { ...FILLED[kind], ...value }
      : value;
  };
  return { stubs: { agent }, rows, currentTree: () => tree, published };
};

const run = async (overrides, runArgs = args) => {
  const stub = makeStubs(overrides);
  const { result, calls } = await runWorkflow(implementJs, { args: runArgs, stubs: stub.stubs });
  const kinds = calls.agent.map((c) => kindOf(c.opts));
  return { result, calls, kinds, rows: stub.rows, published: stub.published };
};

test("a first review with no required finding ends verified_local, and the start and terminal rows share one run_id", async () => {
  const { result, rows } = await run();
  assert.equal(result.status, "verified_local");
  assert.equal(result.branch, "fix/12-fix-login-crash-on");
  assert.equal(result.worktree, `${repo}/.claude/worktrees/implement-12`);
  assert.equal(result.review.status, "accepted");
  assert.deepEqual([result.check_runs, result.review_rounds, result.repairs], [1, 1, 0]);
  assert.deepEqual(
    rows.map((r) => [r.reason, r.run_id]),
    [
      ["started", ""],
      ["verified_local", RUN_ID],
    ],
  );
  assert.equal(rows[1].branch, "fix/12-fix-login-crash-on");
});

test("a failing check goes to repair with its log, and a required finding keeps the loop going until the reviewer marks it fixed", async () => {
  const repairPrompts = [];
  const { result } = await run({
    check: [(_, { tree }) => ({ exit_code: 1, log_tail: "FAIL login.test", tree })],
    review: [
      (_, { tree }) => reviewReply(tree, { newItems: [finding()] }),
      (_, { tree }) =>
        reviewReply(tree, {
          updates: [{ id: "R1-1", disposition: "fixed", reason: "fixed at line 3" }],
        }),
    ],
    repair: [
      (prompt) => {
        repairPrompts.push(prompt);
        return { status: "repaired", findings: "r1" };
      },
      (prompt) => {
        repairPrompts.push(prompt);
        return { status: "repaired", findings: "r2" };
      },
    ],
  });
  assert.equal(result.status, "verified_local");
  assert.deepEqual([result.check_runs, result.review_rounds, result.repairs], [3, 2, 2]);
  assert.match(repairPrompts[0], /FAIL login\.test/);
  assert.match(repairPrompts[1], /R1-1/);
  assert.deepEqual(
    result.review.items.map((i) => [i.id, i.disposition]),
    [["R1-1", "fixed"]],
  );
});

test("the loop has no round cap: six needs_changes rounds still end in acceptance", async () => {
  const stillOpen = (_, { tree }) =>
    reviewReply(tree, { updates: [{ id: "R1-1", disposition: "open", reason: "still broken" }] });
  const { result } = await run({
    review: [
      (_, { tree }) => reviewReply(tree, { newItems: [finding()] }),
      stillOpen,
      stillOpen,
      stillOpen,
      stillOpen,
      stillOpen,
      (_, { tree }) =>
        reviewReply(tree, { updates: [{ id: "R1-1", disposition: "fixed", reason: "done" }] }),
    ],
  });
  assert.equal(result.status, "verified_local");
  assert.equal(result.review_rounds, 7);
  assert.equal(result.repairs, 6);
});

test("a non-required concern does not block acceptance, since status is computed from required open items", async () => {
  const { result } = await run({
    review: [
      (_, { tree }) =>
        reviewReply(tree, { newItems: [finding({ kind: "concern", required: false })] }),
    ],
  });
  assert.equal(result.status, "verified_local");
  assert.equal(result.review.items[0].disposition, "open");
});

test("a review that omits, duplicates, or invents a prior finding ID, or echoes another target, stops as invalid-review", async () => {
  const first = (_, { tree }) => reviewReply(tree, { newItems: [finding()] });
  const cases = {
    omitted: (_, { tree }) => reviewReply(tree),
    duplicated: (_, { tree }) =>
      reviewReply(tree, {
        updates: [
          { id: "R1-1", disposition: "fixed", reason: "a" },
          { id: "R1-1", disposition: "fixed", reason: "b" },
        ],
      }),
    unknown: (_, { tree }) =>
      reviewReply(tree, {
        updates: [
          { id: "R1-1", disposition: "fixed", reason: "a" },
          { id: "R9-9", disposition: "fixed", reason: "b" },
        ],
      }),
    wrongTarget: () =>
      reviewReply(treeOf(999), { updates: [{ id: "R1-1", disposition: "fixed", reason: "a" }] }),
    blankReason: (_, { tree }) =>
      reviewReply(tree, { updates: [{ id: "R1-1", disposition: "fixed", reason: "  " }] }),
  };
  for (const [name, second] of Object.entries(cases)) {
    const { result, rows } = await run({ review: [first, second] });
    assert.equal(result.stopped, "invalid-review", name);
    assert.equal(rows.at(-1).reason, "invalid-review", name);
  }
});

test("a worktree that changes during review stops as source-changed", async () => {
  const stub = makeStubs();
  let snapshots = 0;
  const agent = async (prompt, opts) => {
    if (kindOf(opts) === "snapshot" && ++snapshots === 2) {
      return { issue_digest: DIGEST, tree: treeOf(77), config_blob: CONFIG_BLOB };
    }
    return stub.stubs.agent(prompt, opts);
  };
  const { result } = await runWorkflow(implementJs, { args, stubs: { agent } });
  assert.equal(result.stopped, "source-changed");
});

test("an Issue whose digest changes mid-run stops as requirements-changed", async () => {
  const { result } = await run({ snapshot: [{ issue_digest: "b".repeat(64), tree: treeOf(1) }] });
  assert.equal(result.stopped, "requirements-changed");
});

test("an Issue whose digest cannot be read at the start stops as issue-unreadable", async () => {
  const { result, kinds } = await run({
    target: [() => ({ ...makeStubsTarget(), issue_digest: "" })],
  });
  assert.equal(result.stopped, "issue-unreadable");
  assert.ok(!kinds.includes("prepare"));
});

// The work happens in an isolated worktree, so only the start inputs must be committed; unrelated work
// in the original checkout, such as a /scoping Issue draft, is preserved and does not stop the run.
test("an untracked Issue draft, an earlier worktree, or another modified file in the checkout does not stop the run", async () => {
  const { result } = await run({
    target: [
      () => ({
        ...makeStubsTarget(),
        porcelain: "?? issues/issue-124.md\n?? .claude/worktrees/implement-9/\n M README.md\n",
      }),
    ],
  });
  assert.equal(result.status, "verified_local");
});

// A non-required concern would otherwise be accepted in the same round, so only the line check can stop it.
test("a new finding whose line is below 1 stops as invalid-review", async () => {
  const { result } = await run({
    review: [
      (_, { tree }) =>
        reviewReply(tree, {
          newItems: [
            finding({
              kind: "concern",
              required: false,
              location: { path: "src/login.js", line: 0 },
            }),
          ],
        }),
    ],
  });
  assert.equal(result.stopped, "invalid-review");
});

test("target and prepare gates stop before any implementation agent runs", async () => {
  const target = (patch) => [() => ({ ...makeStubsTarget(), ...patch })];
  const cases = [
    [
      "issue-not-open",
      { target: target({ issue_json: JSON.stringify({ ...ISSUE, state: "CLOSED" }) }) },
    ],
    ["no-actor", { target: target({ user: "" }) }],
    ["uncommitted-start-inputs", { target: target({ porcelain: " M .dotagents.json\n" }) }],
    ["uncommitted-start-inputs", { target: target({ porcelain: "?? .dotagents.json\n" }) }],
    ["no-config", { target: target({ config_found: false, config_text: "" }) }],
    [
      "invalid-config",
      {
        target: target({ config_text: JSON.stringify({ setup: [], check: ["x"], ciChecks: [] }) }),
      },
    ],
    [
      "invalid-config",
      {
        target: target({
          config_text: JSON.stringify({
            ...CONFIG,
            capture: { command: ["x"], destination: "../outside", required: true },
          }),
        }),
      },
    ],
    [
      "branch-exists",
      {
        prepare: [
          { existing: true, created: false, base_sha: "", setup_exits: [], setup_tail: "" },
        ],
      },
    ],
  ];
  for (const [reason, overrides] of cases) {
    const { result, kinds } = await run(overrides);
    assert.equal(result.stopped, reason, reason);
    assert.ok(!kinds.includes("implement"), `${reason}: implementation must not start`);
  }
});

test("a setup command that exits non-zero stops as setup-failed", async () => {
  const { result } = await run({
    target: [
      () => ({
        ...makeStubsTarget(),
        config_text: JSON.stringify({ ...CONFIG, setup: [["bun", "install"]] }),
      }),
    ],
    prepare: [
      { existing: false, created: true, base_sha: BASE_SHA, setup_exits: [1], setup_tail: "err" },
    ],
  });
  assert.equal(result.stopped, "setup-failed");
  assert.equal(result.setup_tail, "err");
});

test("needs_human stops as human-decision-required, and needs_human with empty findings is an invalid reply", async () => {
  const human = await run({ implement: [{ status: "needs_human", findings: "Which API?" }] });
  assert.equal(human.result.stopped, "human-decision-required");
  assert.equal(human.result.why, "Which API?");
  const blank = await run({ implement: [{ status: "needs_human", findings: " " }] });
  assert.equal(blank.result.stopped, "invalid-repair");
});

// The smoke run on #124 stopped here with review: null, which hid the open finding the human had to judge.
test("a repair that returns needs_human after a review keeps that review in the stopped result", async () => {
  const { result } = await run({
    review: [(_, { tree }) => reviewReply(tree, { newItems: [finding({ area: "requirements" })] })],
    repair: [{ status: "needs_human", findings: "Keep the re-captured media?" }],
  });
  assert.equal(result.stopped, "human-decision-required");
  assert.deepEqual(
    result.review.items.map((i) => [i.id, i.disposition]),
    [["R1-1", "open"]],
  );
});

test("a missing repo stops without writing a run row", async () => {
  const { result, rows } = await run({}, { issue: "12" });
  assert.equal(result.stopped, "no-repo");
  assert.deepEqual(rows, []);
});

const withTitle = (title, overrides = {}) =>
  run({
    target: [() => ({ ...makeStubsTarget(), issue_json: JSON.stringify({ ...ISSUE, title }) })],
    ...overrides,
  });

test("a title with fewer than two ASCII words takes a 2-4 word description from the naming agent, and an untyped title defaults to feat", async () => {
  const { result, kinds } = await withTitle("[Feature] 商品一覧の一致部分を <mark> で強調する", {
    name: [{ description: "highlight-search-match" }],
  });
  assert.equal(result.branch, "feat/12-highlight-search-match");
  assert.ok(kinds.indexOf("name") < kinds.indexOf("prepare"));
  const untyped = await withTitle("ログイン修正", { name: [{ description: "fix-login" }] });
  assert.equal(untyped.result.branch, "feat/12-fix-login");
});

test("a naming reply outside the 2-4 lowercase word shape falls back to the title's own words", async () => {
  const cases = [
    ["ログイン修正", "Fix Login!", "feat/12-issue"],
    ["[Feature] <mark> で強調する", "one", "feat/12-mark"],
    ["[Feature] <mark> で強調する", "a-b-c-d-e", "feat/12-mark"],
  ];
  for (const [title, description, branch] of cases) {
    const { result } = await withTitle(title, { name: [{ description }] });
    assert.equal(result.branch, branch, description);
  }
});

test("a title with two or more ASCII words names the branch without the naming agent", async () => {
  const { result, kinds } = await run();
  assert.equal(result.branch, "fix/12-fix-login-crash-on");
  assert.ok(!kinds.includes("name"));
});

// ---- capture ----
// The trial repo's own capture shape: the adapter lives in the Codex harness, named via {harness}.
const CAPTURE = {
  command: [
    "bun",
    "{harness}/scripts/capture.ts",
    "trial/capture.spec.js",
    "trial/playwright.config.js",
  ],
  destination: "trial/evidence/generated",
  required: false,
};
const withCapture = (captureConfig, overrides = {}, runArgs = args) =>
  run(
    {
      target: [
        () => ({
          ...makeStubsTarget(),
          config_text: JSON.stringify({ ...CONFIG, capture: captureConfig }),
        }),
      ],
      ...overrides,
    },
    runArgs,
  );
const mdOnly = { exit_code: 0, raw: ":100644 100644 aaa bbb M\tREADME.md\n" };

test("a code change is captured before the check, its media is installed, and the review sees the capture", async () => {
  const prompts = {};
  const keep = (kind, reply) => (prompt, ctx) => {
    prompts[kind] = prompt;
    return typeof reply === "function" ? reply(prompt, ctx) : reply;
  };
  const { result, kinds } = await withCapture(CAPTURE, {
    capture: [
      keep("capture", (_, { tree }) => ({
        started: true,
        timed_out: false,
        exit_code: 0,
        log_tail: "",
        tree,
      })),
    ],
    review: [keep("review", (_, { tree }) => reviewReply(tree))],
  });
  assert.equal(result.status, "verified_local");
  assert.equal(result.captures, 1);
  assert.equal(result.capture.decision, "execute");
  assert.equal(result.capture.files[0].name, "list.png");
  assert.ok(
    kinds.indexOf("install") < kinds.indexOf("check"),
    "media is installed before the check runs",
  );
  assert.match(
    prompts.capture,
    /"\$H"'\/scripts\/capture\.ts'/,
    "{harness} expands to the shell variable H",
  );
  assert.match(prompts.capture, /\.claude\/worktrees\/implement-12-capture-1/);
  assert.match(prompts.review, /list\.png/);
});

test("with required: false, a Markdown-only change needs no capture, and a later Markdown-only repair reuses the capture", async () => {
  const docsOnly = await withCapture(CAPTURE, { diff: [mdOnly] });
  assert.equal(docsOnly.result.status, "verified_local");
  assert.equal(docsOnly.result.captures, 0);
  assert.equal(docsOnly.result.capture.decision, "not_required");

  const reused = await withCapture(CAPTURE, {
    diff: [{ exit_code: 0, raw: ":100644 100644 aaa bbb M\tsrc/app.js\n" }, mdOnly],
    review: [
      (_, { tree }) => reviewReply(tree, { newItems: [finding()] }),
      (_, { tree }) =>
        reviewReply(tree, { updates: [{ id: "R1-1", disposition: "fixed", reason: "ok" }] }),
    ],
  });
  assert.equal(reused.result.status, "verified_local");
  assert.equal(reused.result.captures, 1);
  assert.equal(reused.result.capture.decision, "reused");
});

test("after a capture, a saved record beside the destination reuses it, and a destination at the repo root has no record place", async () => {
  const codeThenRecord = (record) => ({
    diff: [
      { exit_code: 0, raw: ":100644 100644 aaa bbb M\tsrc/app.js\n" },
      { exit_code: 0, raw: `:100644 100644 aaa bbb M\t${record}\n` },
    ],
    review: [
      (_, { tree }) => reviewReply(tree, { newItems: [finding()] }),
      (_, { tree }) =>
        reviewReply(tree, { updates: [{ id: "R1-1", disposition: "fixed", reason: "ok" }] }),
    ],
  });
  const nested = await withCapture(CAPTURE, codeThenRecord("trial/evidence/run.json"));
  assert.equal(nested.result.captures, 1);
  assert.equal(nested.result.capture.decision, "reused");

  const atRoot = await withCapture(
    { ...CAPTURE, destination: "generated" },
    codeThenRecord("run.json"),
  );
  assert.equal(atRoot.result.captures, 2);
  assert.equal(atRoot.result.capture.decision, "execute");
});

test("a change to a capture definition, a mode change, or required: true forces a capture even when the path ends in .md", async () => {
  const definition = await withCapture(
    { ...CAPTURE, command: [...CAPTURE.command, "trial/capture-notes.md"] },
    { diff: [{ exit_code: 0, raw: ":100644 100644 aaa bbb M\ttrial/capture-notes.md\n" }] },
  );
  assert.equal(definition.result.captures, 1);
  const executable = await withCapture(CAPTURE, {
    diff: [{ exit_code: 0, raw: ":100644 100755 aaa bbb M\tREADME.md\n" }],
  });
  assert.equal(executable.result.captures, 1);
  const required = await withCapture({ ...CAPTURE, required: true }, { diff: [mdOnly] });
  assert.equal(required.result.captures, 1);
  assert.ok(
    !required.kinds.includes("diff"),
    "required: true captures without consulting the diff",
  );
});

// required: true recaptures on every change, so only an unchanged tree can reuse the capture.
test("with required: true, a repair that leaves the tree unchanged reuses the capture without a diff", async () => {
  const { result, kinds } = await withCapture(
    { ...CAPTURE, required: true },
    {
      review: [
        (_, { tree }) => reviewReply(tree, { newItems: [finding()] }),
        (_, { tree }) =>
          reviewReply(tree, { updates: [{ id: "R1-1", disposition: "fixed", reason: "ok" }] }),
      ],
      repair: [{ status: "repaired", findings: "no file change needed" }],
    },
  );
  assert.equal(result.status, "verified_local");
  assert.equal(result.captures, 1);
  assert.equal(result.capture.decision, "reused");
  assert.ok(!kinds.includes("diff"));
});

test("a failing capture goes to repair with its log instead of running the check", async () => {
  let repairPrompt = "";
  const { result } = await withCapture(CAPTURE, {
    capture: [
      (_, { tree }) => ({
        started: true,
        timed_out: false,
        exit_code: 1,
        log_tail: "spec failed: list",
        tree,
      }),
    ],
    repair: [
      (prompt) => {
        repairPrompt = prompt;
        return { status: "repaired", findings: "fixed spec" };
      },
    ],
  });
  assert.equal(result.status, "verified_local");
  assert.equal(result.captures, 2);
  assert.match(repairPrompt, /spec failed: list/);
});

test("capture stops: timeout, unavailable adapter, a capture that writes into the worktree, ignored media, and invalid media", async () => {
  const shot = (patch) => [
    (_, { tree }) => ({
      started: true,
      timed_out: false,
      exit_code: 0,
      log_tail: "",
      tree,
      ...patch,
    }),
  ];
  const cases = [
    ["capture-timeout", { capture: shot({ timed_out: true, exit_code: -1 }) }],
    ["capture-unavailable", { capture: shot({ exit_code: 78 }) }],
    ["capture-unavailable", { capture: shot({ started: false, exit_code: -1 }) }],
    ["source-changed", { capture: shot({ tree: treeOf(999) }) }],
    [
      "capture-media-ignored",
      { install: [{ stdout: JSON.stringify({ ok: false, reason: "ignored" }), tree: treeOf(2) }] },
    ],
    [
      "invalid-capture",
      {
        install: [
          {
            stdout: JSON.stringify({ ok: false, reason: "Invalid capture media: a.png" }),
            tree: treeOf(2),
          },
        ],
      },
    ],
  ];
  for (const [reason, overrides] of cases) {
    const { result, kinds } = await withCapture(CAPTURE, overrides);
    assert.equal(result.stopped, reason, reason);
    assert.ok(!kinds.includes("check"), `${reason}: the check does not run after a capture stop`);
  }
});

// The default target reply, reused by the gate tests that patch one field of it.
// ---- review context and identity checks carried over from Codex ----
test("the next review reads every repair explanation since the previous review, including one followed by a failed check, and a completed review clears them", async () => {
  const reviewPrompts = [];
  const review = (reply) => (prompt, ctx) => {
    reviewPrompts.push(prompt);
    return reply(ctx);
  };
  const { result } = await run({
    check: [
      (_, { tree }) => ({ exit_code: 1, log_tail: "FAIL", tree }),
      (_, { tree }) => ({ exit_code: 1, log_tail: "FAIL again", tree }),
    ],
    repair: [
      { status: "repaired", findings: "first: kept parser because the test is wrong" },
      { status: "repaired", findings: "second: fixed the fixture" },
      { status: "repaired", findings: "third: handled the null case" },
    ],
    review: [
      review(({ tree }) => reviewReply(tree, { newItems: [finding()] })),
      review(({ tree }) =>
        reviewReply(tree, { updates: [{ id: "R1-1", disposition: "fixed", reason: "done" }] }),
      ),
    ],
  });
  assert.equal(result.status, "verified_local");
  assert.ok(reviewPrompts[0].includes("first: kept parser because the test is wrong"));
  assert.ok(reviewPrompts[0].includes("second: fixed the fixture"));
  assert.ok(!reviewPrompts[0].includes("third:"));
  assert.ok(reviewPrompts[1].includes("third: handled the null case"));
  assert.ok(
    !reviewPrompts[1].includes("first:"),
    "a completed review consumed the earlier repairs",
  );
});

test("a review naming a document missing from the reviewed tree, or a directory, stops as invalid-review; tracked files pass, and a review naming none lists nothing", async () => {
  const doc = (path) => ({ path, role: "current", reason: "read it" });
  const withDocs = (documents, listing) =>
    run({
      review: [(_, { tree }) => ({ ...reviewReply(tree), documents })],
      ...(listing === undefined ? {} : { documents: [{ exit_code: 0, listing }] }),
    });
  const ok = await withDocs([doc("README.md"), doc("docs/guide.md")]);
  assert.equal(ok.result.status, "verified_local");
  const listPrompt = ok.calls.agent.find((c) => kindOf(c.opts) === "documents").prompt;
  // `git -c` is denied as a permission prompt in a non-interactive session, so the listing runs without it.
  assert.ok(!listPrompt.includes("'-c'"), "no command-scoped git config");
  // git quotes a non-ASCII path with octal escapes; the script compares against that form.
  const japanese = await withDocs(
    [doc("docs/日本.md")],
    `100644 blob ${"d".repeat(40)}\t"docs/\\346\\227\\245\\346\\234\\254.md"`,
  );
  assert.equal(japanese.result.status, "verified_local", japanese.result.why);
  const missing = await withDocs(
    [doc("README.md"), doc("gone.md")],
    `100644 blob ${"d".repeat(40)}\tREADME.md`,
  );
  assert.equal(missing.result.stopped, "invalid-review");
  assert.match(missing.result.why, /gone\.md/);
  const dir = await withDocs([doc("docs")], `040000 tree ${"d".repeat(40)}\tdocs`);
  assert.equal(dir.result.stopped, "invalid-review");
  const none = await run();
  assert.ok(!none.kinds.includes("documents"));
});

test("the Issue digest covers state and updatedAt, read with --repo, and an Issue URL from another repository stops before anything is prepared", async () => {
  const { calls } = await run();
  const snapshotPrompt = calls.agent.find((c) => kindOf(c.opts) === "snapshot").prompt;
  assert.ok(snapshotPrompt.includes("--repo 'o/r' --json title,body,state,updatedAt"));
  const foreign = await run({}, { ...args, issue: "https://github.com/x/other/issues/12" });
  assert.equal(foreign.result.stopped, "issue-repo-mismatch");
  assert.ok(!foreign.kinds.includes("prepare"));
  const same = await run({}, { ...args, issue: "https://github.com/o/r/issues/12" });
  assert.equal(same.result.status, "verified_local");
});

test("the worktree is cut from the checkout's local HEAD with the config read from that commit, and a HEAD that moves during preparation stops", async () => {
  const { calls } = await run();
  const targetPrompt = calls.agent.find((c) => kindOf(c.opts) === "target").prompt;
  assert.ok(targetPrompt.includes("git show HEAD:.dotagents.json"));
  const preparePrompt = calls.agent.find((c) => kindOf(c.opts) === "prepare").prompt;
  assert.ok(preparePrompt.includes(`'${repo}/.claude/worktrees/implement-12' '${BASE_SHA}'`));
  assert.ok(!preparePrompt.includes("fetch"));
  const moved = await run({
    prepare: [
      {
        existing: false,
        created: true,
        base_sha: "9".repeat(40),
        setup_exits: [],
        setup_tail: "",
      },
    ],
  });
  assert.equal(moved.result.stopped, "start-head-changed");
  assert.ok(!moved.kinds.includes("implement"));
});

test("an edit to .dotagents.json inside the worktree stops as config-changed", async () => {
  const { result, kinds } = await run({
    snapshot: [{ issue_digest: DIGEST, tree: treeOf(1), config_blob: "c".repeat(40) }],
  });
  assert.equal(result.stopped, "config-changed");
  assert.ok(!kinds.includes("check"));
});

test("an Issue that changes while the check runs stops before the repair starts", async () => {
  const { result, kinds } = await run({
    check: [(_, { tree }) => ({ exit_code: 1, log_tail: "FAIL", tree })],
    snapshot: (_, ctx) => ({
      issue_digest: ctx.label.startsWith("before-repair") ? "e".repeat(64) : DIGEST,
      tree: ctx.tree,
    }),
  });
  assert.equal(result.stopped, "requirements-changed");
  assert.ok(!kinds.includes("repair"));
});

// ---- references pinned to the start commit (Codex --start-commit / --report) ----
const REPORT = { path: "docs/research/reset-behavior.md", blob: "1".repeat(40) };
const WIKI = { path: "docs/wiki/search.md", blob: "2".repeat(40) };
const listingOf = (...entries) =>
  entries.map(({ path, blob, mode = "100644" }) => `${mode} blob ${blob}\t${path}`).join("\n");
const withReports = (runArgs, listing, overrides = {}) =>
  run(
    {
      target: [() => ({ ...makeStubsTarget(), report_listing: listing })],
      ...overrides,
    },
    runArgs,
  );

test("pinned references are checked at the start commit and reach the implementation, repair, and review agents", async () => {
  const pinned = { ...args, startCommit: BASE_SHA, reports: [REPORT, WIKI] };
  const { result, calls } = await withReports(pinned, listingOf(REPORT, WIKI), {
    check: [(_, { tree }) => ({ exit_code: 1, log_tail: "FAIL", tree })],
  });
  assert.equal(result.status, "verified_local");
  const targetPrompt = calls.agent.find((c) => kindOf(c.opts) === "target").prompt;
  assert.ok(
    targetPrompt.includes(
      "'git' 'ls-tree' 'HEAD' '--' 'docs/research/reset-behavior.md' 'docs/wiki/search.md'",
    ),
  );
  for (const kind of ["implement", "repair", "review"]) {
    const prompt = calls.agent.find((c) => kindOf(c.opts) === kind).prompt;
    assert.ok(prompt.includes(REPORT.blob), `${kind} receives the pinned references`);
    assert.ok(prompt.includes(BASE_SHA), `${kind} receives the start commit`);
  }
});

test("a pinned reference that differs from, or is missing at, the start commit stops as report-mismatch, and a start commit other than HEAD stops as start-commit-mismatch", async () => {
  const pinned = { ...args, startCommit: BASE_SHA, reports: [REPORT, WIKI] };
  const cases = [
    ["report-mismatch", pinned, listingOf(REPORT, { ...WIKI, blob: "3".repeat(40) })],
    ["report-mismatch", pinned, listingOf(REPORT)],
    ["report-mismatch", pinned, listingOf(REPORT, { ...WIKI, mode: "120000" })],
    ["start-commit-mismatch", { ...pinned, startCommit: "4".repeat(40) }, listingOf(REPORT, WIKI)],
  ];
  for (const [reason, runArgs, listing] of cases) {
    const { result, kinds } = await withReports(runArgs, listing);
    assert.equal(result.stopped, reason, reason);
    assert.ok(!kinds.includes("prepare"), `${reason}: nothing is prepared`);
  }
  const dirty = await run(
    {
      target: [
        () => ({
          ...makeStubsTarget(),
          porcelain: ` M ${REPORT.path}\n`,
          report_listing: listingOf(REPORT),
        }),
      ],
    },
    { ...args, startCommit: BASE_SHA, reports: [REPORT] },
  );
  assert.equal(dirty.result.stopped, "uncommitted-start-inputs");
});

test("malformed references stop as invalid-reports before any target is read: no start commit, a path outside docs/research|wiki|decisions, a non-Markdown file, a bad blob, or a duplicate", async () => {
  const bad = [
    { reports: [REPORT] },
    { startCommit: BASE_SHA, reports: [{ ...REPORT, path: "docs/other/x.md" }] },
    { startCommit: BASE_SHA, reports: [{ ...REPORT, path: "docs/research/../../x.md" }] },
    { startCommit: BASE_SHA, reports: [{ ...REPORT, path: "docs/research/x.txt" }] },
    { startCommit: BASE_SHA, reports: [{ ...REPORT, blob: "xyz" }] },
    { startCommit: BASE_SHA, reports: [REPORT, REPORT] },
    { startCommit: "short", reports: [] },
  ];
  for (const extra of bad) {
    const { result, kinds } = await run({}, { ...args, ...extra });
    assert.equal(result.stopped, "invalid-reports", JSON.stringify(extra));
    assert.ok(!kinds.includes("target"));
  }
});

// ---- revising a PR this workflow published (Codex --previous-run / --request-file) ----
const REQUEST =
  "Adopted finding: the heading misnames the field. Expected: rename it. Permission: docs only.";
const revisionArgs = { issue: "12", repo, revision: { pr: PR_URL, request: REQUEST } };
const revisionTarget = (patch = {}) => [
  () => ({
    ...makeStubsTarget(),
    revision_pr: JSON.stringify(PR_FIELDS),
    revision_body_sha: START_BODY_SHA,
    revision_row: JSON.stringify(ROW),
    ...patch,
  }),
];
const onPublished = (_, { tree }) => ({
  commit_exit: 0,
  commit: COMMIT,
  parent: PUBLISHED,
  tree,
  files: "docs/a.md\n",
});
const revise = (overrides = {}) =>
  run({ target: revisionTarget(), commit: [onPublished], ...overrides }, revisionArgs);

test("a revision reuses the earlier worktree, reviews the whole PR against the Issue and the request, commits on the published head, rewrites the body, and never opens a new PR", async () => {
  const { result, kinds, calls, rows } = await revise({
    pulls: [
      {
        actor: "thkt",
        pulls_exit: 0,
        pulls_json: JSON.stringify([
          [{ html_url: PR_URL, head: { ref: BRANCH, repo: { full_name: "o/r" } } }],
        ]),
      },
    ],
  });
  assert.equal(result.status, "published_draft", `${result.stopped}: ${result.why}`);
  assert.equal(result.url, PR_URL);
  assert.ok(kinds.includes("reprepare") && !kinds.includes("prepare"));
  assert.ok(kinds.includes("edit") && !kinds.includes("create"));
  assert.ok(
    kinds.indexOf("revision") < kinds.indexOf("commit"),
    "the PR is re-read before the commit",
  );
  const promptOf = (kind) => calls.agent.find((c) => kindOf(c.opts) === kind).prompt;
  assert.ok(promptOf("implement").includes(REQUEST));
  const review = promptOf("review");
  assert.ok(review.includes(REQUEST));
  assert.ok(review.includes(`"publishedHead":"${PUBLISHED}"`));
  assert.ok(review.includes(`"baseCommit":"${BASE_SHA}"`), "the review diff spans the whole PR");
  assert.ok(promptOf("edit").includes("'--body-file'"));
  const last = rows.at(-1);
  assert.equal(last.reason, "published_draft");
  assert.equal(last.revision, PR_URL);
  assert.equal(last.base_sha, BASE_SHA);
});

test("a fresh publication records its base, so a later revision can find the PR-wide base", async () => {
  const { rows } = await run({}, publishArgs);
  assert.equal(rows.at(-1).base_sha, BASE_SHA);
  assert.match(rows.at(-1).body_digest, /^[0-9a-f]{8}:\d+$/);
});

test("a revision of a ready PR returns it to draft before any write, and a draft that cannot be confirmed stops without pushing", async () => {
  const ready = { ...PR_FIELDS, draft: false };
  const back = await revise({
    revision: [{ pr_fields: JSON.stringify(ready), body_sha: START_BODY_SHA }],
  });
  assert.equal(back.result.status, "published_draft");
  assert.ok(back.kinds.indexOf("undo") < back.kinds.indexOf("commit"));
  const stuck = await revise({
    revision: [{ pr_fields: JSON.stringify(ready), body_sha: START_BODY_SHA }],
    undo: [{ undo_exit: 0, is_draft: false }],
  });
  assert.equal(stuck.result.stopped, "publication-unconfirmed");
  assert.ok(!stuck.kinds.includes("push") && !stuck.kinds.includes("commit"));
});

test("revision stops: malformed input, no record of the publication, a PR or worktree that moved, a config that differs across the PR, and a commit off the published head", async () => {
  const bad = [
    { ...revisionArgs, revision: { pr: PR_URL, request: "  " } },
    { ...revisionArgs, revision: { pr: "not-a-url", request: REQUEST } },
    { ...revisionArgs, revision: { pr: "https://github.com/x/other/pull/3", request: REQUEST } },
    { ...revisionArgs, publish: false },
  ];
  for (const runArgs of bad) {
    const { result } = await run({ target: revisionTarget() }, runArgs);
    assert.equal(result.stopped, "invalid-revision", JSON.stringify(runArgs.revision));
  }
  const cases = [
    ["revision-no-record", { target: revisionTarget({ revision_row: "" }) }],
    [
      "revision-no-record",
      { target: revisionTarget({ revision_row: JSON.stringify({ ...ROW, issue: "99" }) }) },
    ],
    [
      "revision-target-changed",
      {
        target: revisionTarget({ revision_pr: JSON.stringify({ ...PR_FIELDS, head_sha: COMMIT }) }),
      },
    ],
    [
      "revision-target-changed",
      {
        target: revisionTarget({ revision_pr: JSON.stringify({ ...PR_FIELDS, user: "someone" }) }),
      },
    ],
    [
      "revision-target-changed",
      {
        target: revisionTarget({ revision_pr: JSON.stringify({ ...PR_FIELDS, state: "closed" }) }),
      },
    ],
    [
      "revision-worktree-mismatch",
      { reprepare: [(_, ctx) => ({ ...repreparedAt(ctx), wt_status: " M a.js" })] },
    ],
    [
      "revision-worktree-mismatch",
      { reprepare: [(_, ctx) => ({ ...repreparedAt(ctx), head: COMMIT })] },
    ],
    [
      "config-changed",
      { reprepare: [(_, ctx) => ({ ...repreparedAt(ctx), base_config_blob: "c".repeat(40) })] },
    ],
    [
      "revision-target-changed",
      { revision: [{ pr_fields: JSON.stringify(PR_FIELDS), body_sha: "7".repeat(64) }] },
    ],
    [
      "revision-target-changed",
      {
        revision: [
          {
            pr_fields: JSON.stringify({ ...PR_FIELDS, head_sha: COMMIT }),
            body_sha: START_BODY_SHA,
          },
        ],
      },
    ],
    [
      "commit-mismatch",
      {
        commit: [
          (_, { tree }) => ({ commit_exit: 0, commit: COMMIT, parent: BASE_SHA, tree, files: "" }),
        ],
      },
    ],
  ];
  for (const [reason, overrides] of cases) {
    const { result, kinds } = await revise(overrides);
    assert.equal(result.stopped, reason, `${reason}: ${result.why}`);
    assert.ok(!kinds.includes("push"), `${reason}: nothing is pushed`);
    assert.ok(!kinds.includes("create"), `${reason}: no PR is opened`);
  }
});

// The earlier worktree as the revision prepare agent reports it, clean at the published head.
function repreparedAt() {
  return {
    existing: true,
    created: false,
    wt_status: "",
    wt_branch: BRANCH,
    head: PUBLISHED,
    config_blob: CONFIG_BLOB,
    base_config_blob: CONFIG_BLOB,
    setup_exits: [],
    setup_tail: "",
  };
}

// ---- what a stop leaves for the human (Codex result.remaining) ----
test("a stop names the work that remains: local verification before acceptance, publication before the PR exists, and CI after it", async () => {
  const early = await run({ target: [() => ({ ...makeStubsTarget(), user: "" })] }, publishArgs);
  assert.deepEqual(early.result.remaining.slice(0, 2), ["local_verification", "publication"]);
  const beforePr = await run(
    { push: [{ push_exit: 1, push_tail: "denied", remote_sha: "" }] },
    publishArgs,
  );
  assert.equal(beforePr.result.remaining[0], "publication");
  assert.ok(!beforePr.result.remaining.includes("local_verification"));
  const afterPr = await run(
    {
      ci: [
        (_, { body }) => ({
          view_exit: 0,
          view_json: JSON.stringify(
            ciView(body, {
              statusCheckRollup: [{ name: "tests", status: "COMPLETED", conclusion: "FAILURE" }],
            }),
          ),
        }),
      ],
    },
    publishArgs,
  );
  assert.equal(afterPr.result.stopped, "ci-failed");
  assert.equal(afterPr.result.remaining[0], "ci");
  assert.ok(afterPr.result.remaining.includes("mark_ready"));
});

// ---- config ----
test("config follows the Codex target contract: repository, remote, and baseBranch are required and unknown fields are rejected", async () => {
  const withConfig = (config) =>
    run({ target: [() => ({ ...makeStubsTarget(), config_text: JSON.stringify(config) })] });
  const { repository: _r, ...noRepository } = CONFIG;
  const { baseBranch: _b, ...noBase } = CONFIG;
  for (const config of [noRepository, noBase, { ...CONFIG, extra: true }]) {
    const { result, kinds } = await withConfig(config);
    assert.equal(result.stopped, "invalid-config", JSON.stringify(config));
    assert.ok(!kinds.includes("prepare"));
  }
});

test("a string setup or check runs through /bin/sh -c, as the Codex target contract normalizes it", async () => {
  const prompts = [];
  const { result } = await run({
    target: [
      () => ({
        ...makeStubsTarget(),
        config_text: JSON.stringify({ ...CONFIG, setup: "bun install", check: "bun run check" }),
      }),
    ],
    prepare: [
      (prompt) => {
        prompts.push(prompt);
        return {
          existing: false,
          created: true,
          base_sha: BASE_SHA,
          setup_exits: [0],
          setup_tail: "",
        };
      },
    ],
    check: [
      (prompt, { tree }) => {
        prompts.push(prompt);
        return { exit_code: 0, log_tail: "ok", tree };
      },
    ],
  });
  assert.equal(result.status, "verified_local");
  assert.match(prompts[0], /'\/bin\/sh' '-c' 'bun install'/);
  assert.match(prompts[1], /'\/bin\/sh' '-c' 'bun run check'/);
});

test("a remote pointing at another repository, a non-github.com GH_HOST, or a publish run without ciChecks or push permission stops at Target", async () => {
  const target = (patch) => [() => ({ ...makeStubsTarget(), ...patch })];
  const cases = [
    ["remote-mismatch", { remotes: "origin\thttps://github.com/x/other.git (fetch)\n" }, args],
    ["remote-mismatch", { remotes: "" }, args],
    ["remote-mismatch", { remotes: `origin\t${PUSH_URL} (fetch)\n` }, args],
    ["gh-host", { gh_host: "ghe.example.com" }, args],
    ["no-ci-checks", { config_text: JSON.stringify({ ...CONFIG, ciChecks: [] }) }, publishArgs],
    [
      "no-permission",
      { repo_json: JSON.stringify({ nameWithOwner: "o/r", viewerPermission: "READ" }) },
      publishArgs,
    ],
    [
      "repository-mismatch",
      { repo_json: JSON.stringify({ nameWithOwner: "x/other", viewerPermission: "ADMIN" }) },
      args,
    ],
  ];
  for (const [reason, patch, runArgs] of cases) {
    const { result, kinds } = await run({ target: target(patch) }, runArgs);
    assert.equal(result.stopped, reason, reason);
    assert.ok(!kinds.includes("prepare"), `${reason}: nothing is prepared`);
  }
  // Without publishing, an empty ciChecks and a read-only viewer are no reason to stop.
  const local = await run(
    {
      target: target({
        config_text: JSON.stringify({ ...CONFIG, ciChecks: [] }),
        repo_json: JSON.stringify({ nameWithOwner: "o/r", viewerPermission: "READ" }),
      }),
    },
    args,
  );
  assert.equal(local.result.status, "verified_local");
  // An agent may transcribe git remote -v's tab as spaces; the same remotes still match.
  const spaced = await run(
    { target: target({ remotes: `origin  ${PUSH_URL} (fetch)\norigin  ${PUSH_URL} (push)\n` }) },
    args,
  );
  assert.equal(spaced.result.status, "verified_local");
});

// ---- The commands the body and readback agents run, executed for real ----
// The command inside a prompt step's inline code, as the agent is told to run it verbatim.
const stepCommand = (prompt, step) => {
  const line = prompt.split("\n").find((l) => l.startsWith(`${step}. \``)) || "";
  return line.slice(line.indexOf("`") + 1, line.lastIndexOf("`:"));
};

test("the body commands write a body carrying half-width kana, quotes, and backticks byte for byte, and the readback projection digests the published body the same way", async () => {
  const dir = mkdtempSync(join(tmpdir(), "implement-body-"));
  const localFile = join(dir, "pr.md");
  const tricky = 'のーと and ﾉｰﾄ give 0; `　pen　` trims; it\'s "quoted" $HOME \\ back';
  let wrote = "";
  let reportedDigest = "";
  const { result } = await run(
    {
      review: [
        (_, { tree }) => ({ ...reviewReply(tree), assessments: { ...assessments, tests: tricky } }),
      ],
      body: [
        (prompt) => {
          const swap = (cmd) =>
            cmd.replace(`'${repo}/.claude/worktrees/implement-12-pr.md'`, `'${localFile}'`);
          // The agent copies only ASCII, which it cannot rewrite the way it rewrote ﾉｰﾄ into ノート.
          assert.match(bodyBlock(prompt), /^[\x20-\x7e\n]+$/);
          assert.ok(
            !bodyBlock(prompt)
              .split("\n")
              .some((l) => l.length > 120),
            "short lines",
          );
          execSync(swap(bodyBlock(prompt)), { shell: "/bin/bash" });
          wrote = readFileSync(localFile, "utf8");
          reportedDigest = execSync(swap(stepCommand(prompt, 2)), { shell: "/bin/bash" })
            .toString()
            .trim();
          return { write_exit: 0, body_digest: reportedDigest };
        },
      ],
      readback: [
        (prompt) => {
          const rest = join(dir, "pr.json");
          writeFileSync(rest, JSON.stringify({ ...restPr(""), body: wrote, extra: "dropped" }));
          const cmd = stepCommand(prompt, 1).replace(/^gh api '[^']*'/, `cat '${rest}'`);
          return { readback_exit: 0, pr_json: execSync(cmd, { shell: "/bin/bash" }).toString() };
        },
      ],
      ci: [() => ({ view_exit: 0, view_json: JSON.stringify(ciView(wrote)) })],
    },
    publishArgs,
  );
  assert.ok(wrote.includes(tricky), "the file carries the assessment exactly");
  assert.equal(reportedDigest, digestOf(wrote));
  assert.equal(result.status, "published_draft", `${result.stopped}: ${result.why}`);
});

// ---- Ship and CI ----
const SHIP_KINDS = ["pulls", "commit", "body", "probe", "push", "create", "readback", "attach"];
const WRITES = ["push", "create", "attach"];

test("by default an accepted run commits once, pushes, opens a draft PR, reads it back, and ends published_draft once CI passes", async () => {
  const pathy = `Fixed ${repo}/.claude/worktrees/implement-12/src/login.js:3; notes in ~/notes.txt`;
  const { result, kinds, rows, published, calls } = await run(
    {
      review: [
        (_, { tree }) => ({ ...reviewReply(tree), assessments: { ...assessments, code: pathy } }),
      ],
    },
    publishArgs,
  );
  assert.equal(result.status, "published_draft");
  assert.equal(result.url, PR_URL);
  assert.equal(result.commit, COMMIT);
  assert.equal(result.ci.status, "passed");
  assert.deepEqual(
    kinds.filter((k) => SHIP_KINDS.includes(k) || k === "ci"),
    ["pulls", "commit", "body", "probe", "push", "create", "readback", "ci"],
  );
  assert.ok(!result.remaining.includes("ci"));
  assert.ok(!result.remaining.includes("publication"));
  assert.ok(result.remaining.includes("mark_ready"));
  assert.deepEqual(
    rows.map((r) => r.reason),
    ["started", "published_draft"],
  );
  assert.equal(rows[1].url, PR_URL);
  // The body closes the Issue, names the verified commit, and carries the accepted assessments.
  assert.match(published.body, /^Closes #12\n/);
  assert.ok(published.body.includes(COMMIT));
  assert.ok(published.body.includes("Fixed "), "the accepted assessment reaches the body");
  assert.ok(!published.body.includes(repo), "paths under the checkout are redacted");
  assert.ok(!published.body.includes("~/notes"), "home-relative paths are redacted");
  const commitPrompt = calls.agent.find((c) => kindOf(c.opts) === "commit").prompt;
  assert.ok(commitPrompt.includes("'[Bug] Fix login crash on Safari (#12)'"));
  const pushPrompt = calls.agent.find((c) => kindOf(c.opts) === "push").prompt;
  assert.ok(pushPrompt.includes(`'${BRANCH}:refs/heads/${BRANCH}'`));
  assert.ok(pushPrompt.includes("--no-follow-tags"));
  // The push goes to the configured remote, which Target verified; no command-scoped remote or
  // credential override, which Claude Code's auto mode denies as a remote repoint.
  assert.ok(pushPrompt.includes("push' '--no-follow-tags' 'origin'"));
  assert.ok(!pushPrompt.includes("credential.helper"));
  // An ssh push URL for the same repository is accepted.
  const ssh = await run(
    { probe: [{ push_url: "git@github.com:o/r.git\n", effective_url: PUSH_URL }] },
    publishArgs,
  );
  assert.equal(ssh.result.status, "published_draft");
});

test("publication gates before the first write stop without pushing: a changed tree or Issue, a changed actor, an open PR on the branch, a commit that differs from the accepted tree, a mangled body, or a redirected push URL", async () => {
  const shipSnapshot = (reply) => (_, ctx) =>
    ctx.label === "ship" ? reply(ctx) : { issue_digest: DIGEST, tree: ctx.tree };
  const cases = [
    [
      "source-changed",
      { snapshot: shipSnapshot(() => ({ issue_digest: DIGEST, tree: treeOf(9) })) },
    ],
    [
      "requirements-changed",
      { snapshot: shipSnapshot((ctx) => ({ issue_digest: "b".repeat(64), tree: ctx.tree })) },
    ],
    ["actor-changed", { pulls: [{ actor: "someone", pulls_exit: 0, pulls_json: "[[]]" }] }],
    [
      "branch-pr-exists",
      {
        pulls: [
          {
            actor: "thkt",
            pulls_exit: 0,
            pulls_json: JSON.stringify([
              [
                {
                  html_url: "https://github.com/o/r/pull/9",
                  head: { ref: BRANCH, repo: { full_name: "o/r" } },
                },
              ],
            ]),
          },
        ],
      },
    ],
    ["pulls-unreadable", { pulls: [{ actor: "thkt", pulls_exit: 1, pulls_json: "" }] }],
    [
      "commit-mismatch",
      {
        commit: [
          { commit_exit: 0, commit: COMMIT, parent: BASE_SHA, tree: treeOf(9), files: "a.js\n" },
        ],
      },
    ],
    [
      "commit-mismatch",
      {
        commit: [
          (_, { tree }) => ({
            commit_exit: 0,
            commit: COMMIT,
            parent: "f".repeat(40),
            tree,
            files: "",
          }),
        ],
      },
    ],
    [
      "pr-body-mismatch",
      { body: [{ write_exit: 0, body_digest: digestOf("Closes #12\n(rewritten)") }] },
    ],
    [
      "pr-body-mismatch",
      {
        body: [(prompt) => ({ write_exit: 1, body_digest: digestOf(bodyIn(prompt)) })],
      },
    ],
    [
      "push-target-mismatch",
      { probe: [{ push_url: PUSH_URL, effective_url: "https://evil.example/o/r.git" }] },
    ],
    // One rewritten push URL among several is enough to stop.
    [
      "push-target-mismatch",
      {
        probe: [
          { push_url: `${PUSH_URL}\nhttps://evil.example/o/r.git\n`, effective_url: PUSH_URL },
        ],
      },
    ],
    ["push-target-mismatch", { probe: [{ push_url: "", effective_url: PUSH_URL }] }],
  ];
  for (const [reason, overrides] of cases) {
    const { result, kinds } = await run(
      {
        ...overrides,
        snapshot: overrides.snapshot || ((_, ctx) => ({ issue_digest: DIGEST, tree: ctx.tree })),
      },
      publishArgs,
    );
    assert.equal(result.stopped, reason, reason);
    assert.ok(!kinds.some((k) => WRITES.includes(k)), `${reason}: nothing is pushed or published`);
  }
});

test("an unconfirmed push, PR creation, or readback stops with the known commit and URL and never retries", async () => {
  const cases = [
    [
      "push-unconfirmed",
      { push: [{ push_exit: 1, push_tail: "denied", remote_sha: "" }] },
      "create",
    ],
    [
      "push-unconfirmed",
      { push: [{ push_exit: 0, push_tail: "", remote_sha: "f".repeat(40) }] },
      "create",
    ],
    [
      "publication-unconfirmed",
      { create: [{ create_exit: 1, url: "", create_tail: "x" }] },
      "readback",
    ],
    [
      "publication-unconfirmed",
      {
        readback: [
          (_, { body }) => ({
            readback_exit: 0,
            pr_json: JSON.stringify(restPr(body, { draft: false })),
          }),
        ],
      },
      "ci",
    ],
    [
      "publication-unconfirmed",
      {
        readback: [
          (_, { body }) => ({
            readback_exit: 0,
            pr_json: JSON.stringify(restPr(body, { user: { login: "someone" } })),
          }),
        ],
      },
      "ci",
    ],
    [
      "publication-unconfirmed",
      { readback: [() => ({ readback_exit: 0, pr_json: JSON.stringify(restPr("other body")) })] },
      "ci",
    ],
  ];
  for (const [reason, overrides, never] of cases) {
    const { result, kinds } = await run(overrides, publishArgs);
    assert.equal(result.stopped, reason, reason);
    assert.equal(result.commit, COMMIT, `${reason}: the commit is reported`);
    assert.ok(!kinds.includes(never), `${reason}: ${never} does not run`);
    assert.equal(kinds.filter((k) => k === "push").length, 1, `${reason}: one push at most`);
  }
  const { result } = await run(
    { readback: [() => ({ readback_exit: 0, pr_json: JSON.stringify(restPr("other")) })] },
    publishArgs,
  );
  assert.equal(result.url, PR_URL);
});

test("committed media under the capture destination is attached after the readback, and a failed attach stops as attach-failed", async () => {
  const withMedia = (overrides = {}) =>
    withCapture(
      CAPTURE,
      {
        commit: [
          (_, { tree }) => ({
            commit_exit: 0,
            commit: COMMIT,
            parent: BASE_SHA,
            tree,
            files:
              "trial/public/search.js\ntrial/evidence/generated/list.png\ntrial/evidence/generated/notes.md\n",
          }),
        ],
        ...overrides,
      },
      publishArgs,
    );
  const ok = await withMedia();
  assert.equal(ok.result.status, "published_draft");
  const attachPrompt = ok.calls.agent.find((c) => kindOf(c.opts) === "attach").prompt;
  assert.ok(
    attachPrompt.includes(
      `'${repo}/.claude/worktrees/implement-12/trial/evidence/generated/list.png'`,
    ),
  );
  assert.ok(!attachPrompt.includes("notes.md"));
  assert.ok(ok.result.remaining.includes("rendered_media_check"));
  assert.ok(ok.published.body.includes("trial/evidence/generated/list.png"));
  const failed = await withMedia({ attach: [{ attach_exit: 1, attach_tail: "upload failed" }] });
  assert.equal(failed.result.stopped, "attach-failed");
  assert.equal(failed.result.url, PR_URL);
  assert.ok(!failed.kinds.includes("ci"));
});

test("CI: a failing or required-but-skipped check stops ci-failed as a draft, a changed target stops ci-target-changed, and pending checks are polled again", async () => {
  const view =
    (patch) =>
    (_, { body }) => ({ view_exit: 0, view_json: JSON.stringify(ciView(body, patch)) });
  const rollup = (...checks) => ({ statusCheckRollup: checks });
  const cases = [
    ["ci-failed", [view(rollup({ name: "tests", status: "COMPLETED", conclusion: "FAILURE" }))]],
    ["ci-failed", [view(rollup({ name: "tests", status: "COMPLETED", conclusion: "SKIPPED" }))]],
    [
      "ci-failed",
      [
        view(
          rollup(
            { name: "tests", status: "COMPLETED", conclusion: "SUCCESS" },
            { context: "lint", state: "ERROR" },
          ),
        ),
      ],
    ],
    ["ci-target-changed", [view({ headRefOid: "f".repeat(40) })]],
    ["ci-target-changed", [view({ isDraft: false })]],
    ["ci-target-changed", [view({ body: false })]],
    ["ci-unavailable", [{ view_exit: 1, view_json: "" }]],
  ];
  for (const [reason, ci] of cases) {
    const { result } = await run({ ci }, publishArgs);
    assert.equal(result.stopped, reason, reason);
    assert.equal(result.url, PR_URL, `${reason}: the draft URL is reported`);
  }
  const polled = await run(
    {
      ci: [
        view(rollup()),
        view(rollup({ name: "tests", status: "IN_PROGRESS", conclusion: "" })),
        view(rollup({ name: "tests", status: "COMPLETED", conclusion: "SUCCESS" })),
      ],
    },
    publishArgs,
  );
  assert.equal(polled.result.status, "published_draft");
  assert.equal(polled.result.ci_rounds, 3);
});

test("CI that never registers its required checks stops ci-timed-out after the round budget", async () => {
  const pending = (_, { body }) => ({
    view_exit: 0,
    view_json: JSON.stringify(ciView(body, { statusCheckRollup: [] })),
  });
  const { result, kinds } = await run({ ci: pending }, publishArgs);
  assert.equal(result.stopped, "ci-timed-out");
  assert.equal(kinds.filter((k) => k === "ci").length, result.ci_rounds);
  assert.ok(result.ci_rounds > 1);
  assert.deepEqual(result.ci.missing, ["tests"]);
});

// The body agent's first command writes the PR body from its last argument, an ASCII-only JSON
// string in shell single quotes. Decoding it recovers the body the script generated.
function bodyIn(prompt) {
  const block = bodyBlock(prompt);
  const lines = block.split("\n").slice(1, -1);
  return Buffer.from(lines.join(""), "base64").toString("utf8");
}

// The fenced shell block the body agent runs as one Bash call: a base64 heredoc piped to base64 -d.
function bodyBlock(prompt) {
  const start = prompt.indexOf("```sh\n");
  const end = prompt.indexOf("\n```", start + 1);
  return start < 0 || end < 0 ? "" : prompt.slice(start + "```sh\n".length, end);
}

// The paths after `--` in the documents agent's git ls-tree command, one quoted argv element each.
function listedPaths(prompt) {
  const line = prompt.split("\n").find((l) => l.includes("'ls-tree'")) || "";
  const tail = (line.split("'--' ")[1] || "").replace(/`.*$/, "");
  return tail ? tail.split(" ").map((q) => q.replace(/^'|'$/g, "")) : [];
}

// The same digest the workflow computes: FNV-1a over the UTF-16 code units of the trimmed text,
// with its length. A replica, so a change to the script's digest alone fails the tests.
function digestOf(text) {
  const t = String(text).trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16).padStart(8, "0")}:${t.length}`;
}

// The projection the readback command prints from gh api repos/o/r/pulls/34, with the body
// replaced by its digest.
function restPr(body, patch = {}) {
  return {
    state: "open",
    draft: true,
    html_url: PR_URL,
    user: { login: "thkt" },
    head: { sha: COMMIT, ref: BRANCH, repo: { full_name: "o/r" } },
    base: { ref: "main", repo: { full_name: "o/r" } },
    body: digestOf(body),
    ...patch,
  };
}

// gh pr view --json url,headRefOid,baseRefName,state,isDraft,body,statusCheckRollup, with --jq
// replacing the body by whether it still closes the Issue.
function ciView(body, patch = {}) {
  return {
    url: PR_URL,
    headRefOid: COMMIT,
    baseRefName: "main",
    state: "OPEN",
    isDraft: true,
    body: /Closes #12(?![0-9])/.test(body),
    statusCheckRollup: [{ name: "tests", status: "COMPLETED", conclusion: "SUCCESS" }],
    ...patch,
  };
}

function makeStubsTarget() {
  return {
    issue_exit: 0,
    issue_json: JSON.stringify(ISSUE),
    issue_digest: DIGEST,
    user: "thkt",
    repo_json: JSON.stringify({
      nameWithOwner: "o/r",
      defaultBranchRef: { name: "main" },
      viewerPermission: "ADMIN",
    }),
    porcelain: "",
    config_found: true,
    config_text: JSON.stringify(CONFIG),
    remotes: `origin\t${PUSH_URL} (fetch)\norigin\tgit@github.com:o/r.git (push)\n`,
    gh_host: "",
  };
}
