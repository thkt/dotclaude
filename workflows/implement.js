export const meta = {
  name: "implement",
  description:
    "Implements an agreed Issue in an isolated worktree with one implementation pass, runs a capture, check, independent review, and repair loop until the review is accepted, then commits once, pushes, opens a draft PR, and waits for CI on the same head, following the same flow as Codex's orchestrator.ts. The check and the capture pass on their exit codes, media is installed only after its format is validated, and the script decides acceptance by validating one update per finding ID, so a self-reported pass or a dropped prior finding cannot get through. Before the first write the script re-confirms the Issue, the accepted tree, the actor, and the push target, and it reads back the result of every write. It never retries a write and never switches the PR to ready. The repair loop has no round cap; it stops on changed requirements, a changed target, an invalid reply, or a pending human decision. With publishing turned off it ends at verified_local.",
  whenToUse:
    "Implementing, headlessly, an Issue agreed through /scoping up to a draft PR. It also revises a PR it published, from a revision request a human adopted: pass the PR URL and the request, and it rewrites the body instead of opening a new PR. A review of an existing diff without implementation goes to polish or audit. Pass the Issue number and the target repository's absolute path. The target repository's root needs a .dotagents.json carrying repository, remote, baseBranch, setup, check, ciChecks, and capture, as the Codex target contract defines them, and {harness} in capture expands to the Codex harness at ~/.agents. The check or the capture may open a local server socket, so a session with the sandbox on sets sandbox.network.allowLocalBinding to true before launching. On macOS the capture's browser cannot start inside the sandbox, so a target with a capture configured launches from a session with the sandbox off. Publishing up to a draft PR is the default. With publishing turned off, the run ends by leaving the verified branch and worktree to a human. A run that the environment stopped at the capture, the check, the review, or the writing of the PR body resumes from the start of that round, or of publication, once the cause is fixed. The switch to ready, the published-body check, and human review stay with the /implement skill and the human.",
  phases: [
    { title: "Target" },
    { title: "Prepare" },
    { title: "Implement" },
    { title: "Verify" },
    { title: "Ship" },
    { title: "CI" },
  ],
};

// The flow's canonical source is orchestrator.ts, correction.ts, pr-body.ts, and ci.ts under
// ~/.agents/scripts/implement/, and ~/.agents/scripts/shared/target.ts. The LLM implements and
// reviews; the script computes acceptance, matches IDs, confirms that the requirements and the
// target have not changed, decides whether a capture is needed, reads back each publication
// result, and classifies CI.

// The harness may deliver object args as a JSON-encoded string.
let argsValue = args;
if (typeof argsValue === "string" && argsValue.trim().startsWith("{")) {
  try {
    const decoded = JSON.parse(argsValue);
    if (decoded && typeof decoded === "object") argsValue = decoded;
  } catch {
    // a malformed encoding leaves args as the string it arrived as
  }
}
const input = typeof argsValue === "object" && argsValue ? argsValue : {};
const issueRef = String(typeof argsValue === "string" ? argsValue : input.issue || "").trim();
// Accept only a bare number, #number, or an Issue URL. Freeform text that merely contains digits
// is not read as an Issue number.
const issueNumber =
  (issueRef.match(/^#?(\d+)$/) || issueRef.match(/\/issues\/(\d+)(?:[/?#]|$)/) || [])[1] || "";
const repo = typeof input.repo === "string" ? input.repo.trim() : "";
// Codex's --no-publish. Only an explicit false turns publishing off.
const publishing = input.publish !== false;

const obj = (required, properties) => ({
  type: "object",
  additionalProperties: false,
  required,
  properties,
});
const closed = (properties) => obj(Object.keys(properties), properties);
const str = { type: "string" };
// A string that must not be empty. blankFields, not the schema, rejects the empty string.
const text = { type: "string" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const choice = (values) => ({ type: "string", enum: values });
const list = (items) => ({ type: "array", items });

// Strings derived from the Issue or the config reach the shell as one argv element each, never
// as shell syntax.
const shq = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;
const argvLine = (argv) => argv.map(shq).join(" ");
const bundled = (rel) =>
  `"$(P="$HOME/.claude/${rel}"; [ -e "$P" ] || P="$(find "$HOME/.claude/plugins" -path "*/${rel}" -not -path "*/.ja/*" 2>/dev/null | sort -V | tail -1)"; printf %s "$P")"`;
const parseJsonText = (value) => {
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

// ---- Relays: the commands the script wants run, declared as data ----
// A script cannot run a command, so an agent runs it. The agent does not read the commands as prose and does not
// copy them. It runs workflows/_lib/relay.ts with the digest of the spec; relay.ts reads the spec back from the
// agent's own transcript, runs the steps in order, and prints the fields and their digest (relay_check) as one line
// of JSON. The script compares the fields the agent returned with relay_check, so a single character changed on the
// way back reads as no result. A host that evaluates this script itself finds the spec in the prompt and runs it
// with no agent.
// The body is never transcribed by an LLM; it is compared by digest (FNV-1a over UTF-16 code units, plus the
// length). The function's source is also embedded into node -e, so it uses no template literal.
const digest = (text) => {
  const t = String(text).trimEnd();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + ":" + t.length;
};
const canonical = (fields) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(fields)
        .sort()
        .map((key) => [key, fields[key]]),
    ),
  );
const fieldSchema = (value) =>
  Array.isArray(value) ? list(int) : { type: typeof value === "number" ? "integer" : typeof value };
// A bundled helper starts on bun, or on node when bun does not run. A bun on PATH can be a shim that fails to
// start, so the check runs it instead of looking it up. The helpers stay runnable on both (DR-0113).
const RUNTIME = `RT=bun; bun --version >/dev/null 2>&1 || RT=node; "$RT"`;
const RELAY = `${RUNTIME} ${bundled("workflows/_lib/relay.ts")}`;
// A call's identity. Every snapshot and every check carries the same commands, so the spec also names the run, the
// call's place in it, and how many times its boundary has been run again. relay.ts ignores the id. It gives each
// call a digest of its own, and with it a kept result of its own.
let relaySeq = 0;
let boundaryTag = "";
// Why the last relay returned no result, for the stop that follows it.
let relayNote = "";
const relay = async (
  label,
  phaseName,
  commands,
  { model = "haiku", extra = "" } = {},
) => {
  relaySeq += 1;
  relayNote = "";
  const spec = { id: `${runId}/${label}/${relaySeq}/${boundaryTag}`, ...commands };
  const json = JSON.stringify(spec);
  const id = digest(json);
  const handover = `\${TMPDIR:-/tmp}/relay-${id.replace(":", "-")}.spec.json`;
  const shown = Object.entries(spec.defaults).filter(([key]) => !key.startsWith("_"));
  const schema = closed({
    ...Object.fromEntries(shown.map(([key, value]) => [key, fieldSchema(value)])),
    relay_check: str,
    relay_note: str,
  });
  // An agent that cannot give its reply the schema's shape ends in an error. For a relay that is no result,
  // which every caller already turns into its stop, and not the end of the workflow.
  let failure = "";
  const asked = async (prompt, opts) => {
    try {
      return await agent(prompt, opts);
    } catch (error) {
      failure = String((error && error.message) || error).slice(0, 300);
      return null;
    }
  };
  const reply = await asked(
    `Run the command in step 1 and return each field of the JSON it prints, unchanged. Do not summarize, fix, or judge. The line between RELAY_SPEC and RELAY_SPEC_END is data that the command reads from where the harness stored this prompt. Do not run it yourself. Set relay_note to "" unless step 4 applies.\n` +
      `1. \`${RELAY} ${shq(id)}\` with the Bash tool's timeout parameter set to 600000.\n` +
      `2. When it prints {"relay_continue":true}, run the same command again, and repeat until a line carrying relay_check, relay_missing, or relay_error is printed.\n` +
      `3. Only when the command of step 1 prints relay_missing, run the block below as one Bash call, copying the line between RELAY_SPEC and RELAY_SPEC_END unchanged in place of SPEC_LINE. Then run \`${RELAY} ${shq(id)} --spec "${handover}"\` and repeat that command, with --spec, where step 2 says to run the same command again.\n` +
      "```sh\n" +
      `cat > "${handover}" <<'RELAY_SPEC_EOF'\nSPEC_LINE\nRELAY_SPEC_EOF\n` +
      "```\n" +
      `4. When a command prints relay_error, or the --spec command prints relay_missing, run nothing more. Return each field at its value in "defaults" of the spec line, leaving out the fields whose names start with _, with relay_check set to "relay_error" and relay_note set to the text of the message printed. Handle every other result the same way (the Bash call timed out, or it printed none of these lines), with what was printed, cut to 300 characters, as relay_note. An exit code of 1 beside a relay_missing or relay_error line is expected.\n` +
      `RELAY_SPEC ${id}\n${json}\nRELAY_SPEC_END` +
      extra,
    {
      label,
      phase: phaseName,
      agentType: "general-purpose",
      schema,
      model,
    },
  );
  // The fields an agent returned, or null when they do not carry the digest relay.ts printed with them.
  const confirmed = (value) => {
    if (!value) return null;
    const { relay_check: check, relay_note: _note, ...fields } = value;
    return String(check).trim() === digest(canonical(fields)) ? fields : null;
  };
  const refuse = (why) => {
    relayNote = why;
    log(`relay ${label}: no result (${relayNote}).`);
    return null;
  };
  if (!reply) return refuse(failure ? `the relay agent failed: ${failure}` : "the relay agent returned no result");
  const first = confirmed(reply);
  if (first) return first;
  // relay.ts said why it has no result, and nothing is kept to ask for.
  if (String(reply.relay_check).trim() === "relay_error")
    return refuse(String(reply.relay_note || "").trim() || "relay_error");
  const seen = String(reply.relay_check).trim();
  if (!/^[0-9a-f]{8}:\d+$/.test(seen)) return refuse("the returned fields did not match relay_check, and the reply names no check to ask for the kept result by");
  // A changed character on the way back is the agent's copy, not the commands. relay.ts kept the line it printed,
  // so a second agent returns it without any command running again. relay.ts returns the line only for the check
  // the first agent named, so the line of another call of the same commands is not taken for this one's.
  log(`relay ${label}: the returned fields do not match relay_check (${reply.relay_check}). Asking for the stored result once more.`);
  const again = await asked(
    `Run the command in step 1 and return each field of the JSON it prints, unchanged. Do not summarize, fix, or judge. The command prints the result that was already computed and runs nothing again. Set relay_note to "". When it prints relay_error, return each field as "", 0, false, or [] by its type.\n` +
      `1. \`${RELAY} ${shq(id)} --replay ${shq(seen)}\``,
    { label: `${label}:replay`, phase: phaseName, agentType: "general-purpose", schema, model },
  );
  return confirmed(again) || refuse("the returned fields did not match relay_check, also when asked again");
};

// ---- Run recording: the start row and the terminal row are joined by run_id ----
const counts = { check_runs: 0, review_rounds: 0, repairs: 0, captures: 0, ci_rounds: 0 };
let runId = "";
let recordedBranch = "";
// The commit, PR URL, PR-wide base, and body digest publication has learned, and how the body reached its file:
// body_transport is transcript (write-body.ts read it back) or copied (an agent copied it), and body_fallback is why
// it came to a copy. Stopped rows carry them too, so a human
// can reconcile the actual state from the row. A later revision takes the published head and the PR-wide base from
// the commit and base_sha of a published_draft row.
const published = {
  commit: "",
  url: "",
  base_sha: "",
  body_digest: "",
  body_transport: "",
  body_fallback: "",
};
const recordRun = async (reason) => {
  const payload = {
    run_id: runId,
    issue: issueNumber,
    repo,
    branch: recordedBranch,
    publish: publishing,
    // The URL of the PR a revision revises. Read straight from the input so a stop before validation still carries it.
    revision:
      input.revision && typeof input.revision.pr === "string" ? input.revision.pr.trim() : "",
    ...published,
    reason,
    ...counts,
  };
  const written = await relay(`record:${reason}`, undefined, {
    defaults: { record_out: "" },
    steps: [
      {
        sh: `${RUNTIME} ${bundled("workflows/implement/record.ts")}`,
        cwd: repo,
        stdin: JSON.stringify(payload),
        set: { record_out: "out" },
      },
    ],
  });
  const recorded = written ? parseJsonText(written.record_out) : null;
  const id = String((recorded && recorded.run_id) || "").trim();
  // Recording never stops a run. A row that could not be written goes to the log and the run goes on.
  if (!id) {
    log(
      `The "${reason}" row was not written (the recorder returned no run_id), so this run is missing from implement-runs.jsonl.`,
    );
    return;
  }
  runId = id;
};
// Every stop passes through here, so a run that has both the Issue and the repo always gets a terminal row.
// Canonical source: remaining in orchestrator.ts. A stop also returns the work that remains; shipStop narrows it for publication-stage stops.
const REMAINING_AFTER_PR = ["ci", "published_body_check", "mark_ready", "human_review"];
const stop = async (reason, why, fields = {}) => {
  // Read before the row is recorded: the recorder is a relay too, and starting it clears the note.
  const note = relayNote;
  if (repo && issueNumber) await recordRun(reason);
  return {
    stopped: reason,
    why,
    ...counts,
    run_id: runId,
    remaining: ["local_verification", "publication", ...REMAINING_AFTER_PR],
    // A stop that fixing the cause clears overrides this in fields with the retry to pass on the resume.
    retry_next: null,
    // When the relay before this stop returned no result, why it did not.
    ...(note ? { relay_note: note } : {}),
    ...fields,
  };
};

if (!issueNumber) {
  return await stop("no-issue", "Pass the Issue number or the Issue URL.");
}
if (!repo) {
  return await stop("no-repo", "Pass the target repository as an absolute path.");
}
// References pinned to the start commit (research reports, wiki pages, decision records). Canonical
// source: assertReportReferences in input.ts and research-handoff.ts. References need a start commit,
// and each must be Markdown under docs/research, docs/wiki, or docs/decisions.
const startCommit = typeof input.startCommit === "string" ? input.startCommit.trim() : "";
const reports = input.reports === undefined ? [] : input.reports;
const COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const isReportPath = (p) =>
  typeof p === "string" &&
  /^docs\/(?:research|wiki|decisions)\/.+\.md$/.test(p) &&
  !p.split("/").includes("..");
const referenceProblem = () => {
  if (!Array.isArray(reports)) return "Pass references as an array of {path, blob}";
  if (startCommit && !COMMIT_ID.test(startCommit))
    return "Pass the start commit as a full commit ID";
  if (reports.length && !startCommit) return "References need a start commit";
  const bad = reports.find((r) => !r || !isReportPath(r.path) || !COMMIT_ID.test(String(r.blob)));
  if (bad)
    return `A reference must be Markdown under docs/research, docs/wiki, or docs/decisions with its reviewed blob ID: ${JSON.stringify(bad)}`;
  const paths = reports.map((r) => r.path);
  return new Set(paths).size === paths.length ? "" : "Duplicate reference path";
};
const referenceIssue = referenceProblem();
if (referenceIssue) {
  return await stop("invalid-reports", referenceIssue);
}
// Revising an existing PR. Canonical source: revision.ts and the README section on revising an existing PR. The adopted findings,
// expected result, and permission scope arrive as one text (request), and only a PR this workflow
// published is a target. Args cannot change mid-run, so Codex's hash checks of a request file are not needed.
const revising = input.revision !== undefined;
const revisionUrl = revising && input.revision ? String(input.revision.pr || "").trim() : "";
const revisionRequest =
  revising && input.revision ? String(input.revision.request || "").trim() : "";
const revisionPr = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/([1-9]\d*)$/.exec(
  revisionUrl,
);
const revisionProblem = () => {
  if (!revising) return "";
  if (!revisionPr) return "Pass the PR to revise as https://github.com/OWNER/REPO/pull/N";
  if (!revisionRequest)
    return "Write the adopted findings, expected result, and permission scope in request";
  return publishing
    ? ""
    : "A revision goes through the body update and CI, so publishing cannot be turned off";
};
const revisionIssue = revisionProblem();
if (revisionIssue) {
  return await stop("invalid-revision", revisionIssue);
}
// Resuming a run that stopped. Workflow's resumeFromRunId answers an agent() call whose prompt is unchanged
// from cache, and runs the first call whose prompt changed and everything after it. Marking the prompt that
// opens a boundary resumes the run from there. There are two boundaries. round:N is the start of verify
// round N, which observes the requirements and the tree again before the capture, the check, and the review.
// ship is the start of Ship, which repeats every check that precedes a write. A run does not resume from
// inside a boundary, because the cached results of the earlier steps may not be those of the current Issue,
// worktree, or actor.
// retry carries how many times each boundary has been run again. Dropping the mark of an earlier resume puts
// that boundary's prompt back as it was, and the run starts again from there.
const RETRY_KEY = /^(?:round:[1-9]\d*|ship)$/;
const retrying = input.retry !== undefined;
const retryMap =
  retrying && input.retry && typeof input.retry === "object" && !Array.isArray(input.retry)
    ? input.retry
    : null;
const retryProblem = () => {
  if (!retrying) return "";
  if (!retryMap || !Object.keys(retryMap).length)
    return "Pass the retry_next that the stopped run returned as retry, unchanged";
  const bad = Object.entries(retryMap).find(
    ([key, count]) => !RETRY_KEY.test(key) || !Number.isInteger(count) || count < 1,
  );
  return bad
    ? `A retry boundary is round:N or ship, and its value is an integer of 1 or more: ${JSON.stringify(bad)}`
    : "";
};
const retryIssue = retryProblem();
if (retryIssue) {
  return await stop("invalid-retry", retryIssue);
}
const retryCount = (key) => (retryMap && retryMap[key]) || 0;
// The mark added to the prompt that opens a resumed boundary. It carries the count, so running the same
// boundary once more changes the prompt again.
const retryMark = (key) =>
  retryCount(key)
    ? `\n\nThis call resumes a run that stopped, and this is run-again number ${retryCount(key)} of it. Run it from the start without changing the procedure.`
    : "";
// The retry that runs the stopped boundary once more. The caller passes this value unchanged.
const retryNext = (key) => ({ ...retryMap, [key]: retryCount(key) + 1 });
await recordRun("started");

// ---- Target: check the Issue, the effective user, the repo, uncommitted changes, and .dotagents.json ----
phase("Target");
const BRANCH_NAME_SHAPE = /^[\w][\w./-]*$/;
const isArgv = (v) =>
  Array.isArray(v) && v.length > 0 && v.every((a) => typeof a === "string") && v[0].trim() !== "";
const isNameList = (v) =>
  Array.isArray(v) &&
  v.every((n) => typeof n === "string" && n.trim() !== "") &&
  new Set(v).size === v.length;
// destination is limited to a path relative to the worktree. install-media.ts checks the same condition at run time.
const isRepoRelative = (p) =>
  typeof p === "string" && p.trim() !== "" && !p.startsWith("/") && !p.split("/").includes("..");
const isCapture = (v) =>
  v === null ||
  (Boolean(v) &&
    isArgv(v.command) &&
    isRepoRelative(v.destination) &&
    typeof v.required === "boolean");
// Canonical source: assertTarget in ~/.agents/scripts/shared/target.ts. setup and check also take a
// shell string, which is wrapped in /bin/sh -c to become argv.
const CONFIG_KEYS = ["repository", "remote", "baseBranch", "setup", "check", "ciChecks", "capture"];
const isShell = (v) => typeof v === "string" && v.trim() !== "";
const CONFIG_RULES = [
  [
    (c) => Object.keys(c).every((key) => CONFIG_KEYS.includes(key)),
    `only these fields are allowed: ${CONFIG_KEYS.join(", ")}`,
  ],
  [
    (c) => typeof c.repository === "string" && /^[\w.-]+\/[\w.-]+$/.test(c.repository),
    "repository must be owner/name",
  ],
  [
    (c) => typeof c.remote === "string" && /^[\w.-]+$/.test(c.remote),
    "remote must be a remote name",
  ],
  [
    (c) => typeof c.baseBranch === "string" && BRANCH_NAME_SHAPE.test(c.baseBranch),
    "baseBranch must be a branch name",
  ],
  [
    (c) => isShell(c.setup) || (Array.isArray(c.setup) && c.setup.every(isArgv)),
    "setup must be a shell string or an array of argv arrays ([] when none)",
  ],
  [
    (c) => isShell(c.check) || isArgv(c.check),
    "check must be a shell string or a non-empty argv array",
  ],
  [(c) => isNameList(c.ciChecks), "ciChecks must be an array of unique non-empty check names"],
  [
    (c) => "capture" in c && isCapture(c.capture),
    "capture must be null or {command, destination, required} (null when no media is needed)",
  ],
];
const configErrors = (c) =>
  !c || typeof c !== "object" || Array.isArray(c)
    ? [".dotagents.json is not a JSON object"]
    : CONFIG_RULES.filter(([ok]) => !ok(c)).map(([, message]) => message);

// The Issue's identity is compared by the sha256 of gh's output, not by a transcribed body, so a
// one-character slip in transcription is not read as a change in requirements.
// Canonical source: the Issue fetch in orchestrator.ts. The digest covers state and updatedAt too,
// so an Issue closed mid-run reads as changed.
// The output goes to shasum only when gh fetched it, so a failed gh does not print the digest of an empty input.
const issueDigestCommand = (repoFlag = "") =>
  `out=$(gh issue view ${issueNumber}${repoFlag} --json title,body,state,updatedAt) && printf %s "$out" | shasum -a 256 | cut -d ' ' -f 1`;
const DIGEST_SHAPE = /^[0-9a-f]{64}$/;
// The fields checked on the PR under revision, and its body's sha256. The body is never transcribed by an agent; gh's output goes through shasum.
const prApiPath = revisionPr ? `repos/${revisionPr[1]}/pulls/${revisionPr[2]}` : "";
const PR_FIELDS_JQ =
  "{state, draft, html_url, user: .user.login, head_sha: .head.sha, head_ref: .head.ref, head_repo: .head.repo.full_name, base_ref: .base.ref, base_repo: .base.repo.full_name}";
const prFieldsCommand = argvLine(["gh", "api", prApiPath, "--jq", PR_FIELDS_JQ]);
const prBodyShaCommand = `${argvLine(["gh", "api", prApiPath, "--jq", ".body"])} | shasum -a 256 | cut -d ' ' -f 1`;
// Canonical source: orchestrator.ts. The worktree is cut from the checkout's local HEAD and the config is
// read from that commit, so the validated config and the version that runs cannot differ.
// The start inputs. The status below is limited to them, so a checkout with many untracked files cannot make the
// relay's line longer than a Bash call returns.
const START_INPUTS = [".dotagents.json", ...reports.map((r) => r.path)];
const target = await relay("target", "Target", {
  defaults: {
    issue_exit: -1,
    issue_json: "",
    issue_digest: "",
    user: "",
    repo_json: "",
    porcelain: "",
    config_found: false,
    config_text: "",
    remotes: "",
    gh_host: "",
    head_sha: "",
    report_listing: "",
    revision_pr: "",
    revision_body_sha: "",
    revision_row: "",
  },
  steps: [
    {
      sh: `gh issue view ${issueNumber} --json number,title,body,state,url`,
      cwd: repo,
      set: { issue_exit: "exit", issue_json: "out" },
    },
    { sh: "gh api user --jq .login", cwd: repo, set: { user: "out" } },
    {
      sh: "gh repo view --json nameWithOwner,defaultBranchRef,viewerPermission",
      cwd: repo,
      set: { repo_json: "out" },
    },
    {
      sh: argvLine(["git", "status", "--porcelain", "--untracked-files=all", "--", ...START_INPUTS]),
      cwd: repo,
      set: { porcelain: "out" },
    },
    {
      sh: "git show HEAD:.dotagents.json",
      cwd: repo,
      set: { config_found: "ok", config_text: "out" },
    },
    { sh: issueDigestCommand(), cwd: repo, set: { issue_digest: "out" } },
    { sh: "git remote -v", cwd: repo, set: { remotes: "out" } },
    { sh: "printenv GH_HOST", set: { gh_host: "out" } },
    { sh: "git rev-parse HEAD", cwd: repo, set: { head_sha: "out" } },
    ...(reports.length && !revising
      ? [
          {
            sh: argvLine(["git", "ls-tree", "HEAD", "--", ...reports.map((r) => r.path)]),
            cwd: repo,
            set: { report_listing: "out" },
          },
        ]
      : []),
    ...(revising
      ? [
          { sh: prFieldsCommand, cwd: repo, set: { revision_pr: "out" } },
          { sh: prBodyShaCommand, cwd: repo, set: { revision_body_sha: "out" } },
          {
            sh: `${argvLine(["jq", "-c", "--arg", "url", revisionUrl, 'select(.reason == "published_draft" and .url == $url)'])} "$HOME/.claude/history/implement-runs.jsonl" | tail -1`,
            set: { revision_row: "out" },
          },
        ]
      : []),
  ],
  // The Issue body comes back through this agent. haiku lost the fields after it on a body with quoted markup
  // (one of four whole runs, and 12 of 13 copies of that line alone), where sonnet copied it 10 times of 10.
}, { model: "sonnet" });
if (!target) {
  return await stop("target-unavailable", "The agent checking the target returned no result.");
}
const issue = target.issue_exit === 0 ? parseJsonText(target.issue_json) : null;
const issueDigest = String(target.issue_digest || "").trim();
if (
  !issue ||
  !String(issue.title || "").trim() ||
  !String(issue.body || "").trim() ||
  !DIGEST_SHAPE.test(issueDigest)
) {
  return await stop(
    "issue-unreadable",
    `Could not read the title and body of Issue #${issueNumber}. Check the Issue and the repo.`,
  );
}
if (issue.state !== "OPEN") {
  return await stop(
    "issue-not-open",
    `Issue #${issueNumber} is ${issue.state}. Relaunch with an agreed, OPEN Issue.`,
  );
}
const actor = String(target.user || "").trim();
if (!actor) {
  return await stop(
    "no-actor",
    "gh api user returned no login. Fix the user's gh authentication and relaunch. The run does not switch to another actor.",
  );
}
const repoInfo = parseJsonText(target.repo_json);
if (!repoInfo || !repoInfo.nameWithOwner) {
  return await stop("repo-unreadable", "gh repo view could not read the target repo.");
}
// The work happens in an isolated worktree, so only the start input (.dotagents.json) must be committed.
// Unrelated work in the original checkout (such as a /scoping Issue draft) is preserved and does not stop the run.
// Canonical source: the start-input check in orchestrator.ts ("Required start inputs have uncommitted changes").
const uncommittedInputs = String(target.porcelain || "")
  .split("\n")
  .filter((line) => START_INPUTS.includes(line.slice(3).trim()));
if (uncommittedInputs.length) {
  return await stop(
    "uncommitted-start-inputs",
    "A start input has uncommitted changes. Commit the agreed .dotagents.json, then relaunch. This workflow neither stashes nor carries them over.",
    { porcelain: uncommittedInputs.join("\n") },
  );
}
if (!target.config_found) {
  return await stop(
    "no-config",
    "The target repository's root has no .dotagents.json. Commit the agreed setup, check, ciChecks, and capture, then relaunch.",
  );
}
const settings = parseJsonText(target.config_text);
const configProblems = configErrors(settings);
if (configProblems.length) {
  return await stop("invalid-config", configProblems.join("; "));
}
const shellArgv = (command) => ["/bin/sh", "-c", command];
const config = {
  ...settings,
  setup: typeof settings.setup === "string" ? [shellArgv(settings.setup)] : settings.setup,
  check: typeof settings.check === "string" ? shellArgv(settings.check) : settings.check,
};
const capture = config.capture;
const { repository, remote, baseBranch } = config;
// Canonical source: readTarget in target.ts. GH_HOST, the remote's fetch and push URLs, and the repo gh resolved all point at repository.
const ghHost = String(target.gh_host || "").trim();
if (ghHost && ghHost !== "github.com") {
  return await stop("gh-host", `GH_HOST points at ${ghHost}. Only github.com targets are handled.`);
}
const REMOTE_URL =
  /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/;
const remoteUrls = String(target.remotes || "")
  .split("\n")
  .map((line) => /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim()))
  .filter((m) => m && m[1] === remote);
const remoteMatches =
  ["fetch", "push"].every((way) => remoteUrls.some((m) => m[3] === way)) &&
  remoteUrls.every((m) => (REMOTE_URL.exec(m[2]) || [])[1] === repository);
if (!remoteMatches) {
  return await stop(
    "remote-mismatch",
    `The fetch and push URLs of remote ${remote} do not point at ${repository}. Fix .dotagents.json or the remote, then relaunch.`,
  );
}
// Canonical source: issueNumber in target.ts. An Issue URL from another repo is not reused here by its number alone.
const issueUrlRepo = (/github\.com\/([\w.-]+\/[\w.-]+)\/issues\//.exec(issueRef) || [])[1];
if (issueUrlRepo && issueUrlRepo !== repository) {
  return await stop(
    "issue-repo-mismatch",
    `The Issue URL's repo, ${issueUrlRepo}, differs from repository ${repository} in .dotagents.json. Relaunch with an Issue of the target repo.`,
  );
}
if (repoInfo.nameWithOwner !== repository) {
  return await stop(
    "repository-mismatch",
    `The repo gh resolved, ${repoInfo.nameWithOwner}, differs from repository ${repository} in .dotagents.json.`,
  );
}
// Publication's preconditions are checked at Target, before any write. Codex also requires ciChecks and push permission to publish.
if (publishing && !config.ciChecks.length) {
  return await stop(
    "no-ci-checks",
    "Publishing needs the names of the CI checks to wait for in ciChecks. Add them, or relaunch with publishing turned off.",
  );
}
if (publishing && !["ADMIN", "MAINTAIN", "WRITE"].includes(repoInfo.viewerPermission)) {
  return await stop(
    "no-permission",
    `The permission on the target repo is ${repoInfo.viewerPermission || "unknown"}, which cannot push. The run does not switch to another actor.`,
  );
}
// Canonical source: previousRun in revision.ts. Only a PR this workflow published from this checkout, with its row
// kept, is revised. The published head and the PR-wide base come from that row, not GitHub's current state, so commits
// stacked after publication are detected.
if (revising && revisionPr[1] !== repository) {
  return await stop(
    "invalid-revision",
    `The PR's repo, ${revisionPr[1]}, differs from repository ${repository} in .dotagents.json.`,
  );
}
const revisionRow = revising ? parseJsonText(target.revision_row) : null;
const rowUsable = (row) =>
  Boolean(row) &&
  row.url === revisionUrl &&
  String(row.issue) === issueNumber &&
  row.repo === repo &&
  COMMIT_ID.test(String(row.commit)) &&
  COMMIT_ID.test(String(row.base_sha)) &&
  typeof row.branch === "string" &&
  row.branch !== "";
if (revising && !rowUsable(revisionRow)) {
  return await stop(
    "revision-no-record",
    `There is no record of publishing ${revisionUrl} from this checkout for Issue #${issueNumber} (a published_draft row in implement-runs.jsonl). Only PRs this workflow published are revised.`,
  );
}
// Canonical source: checkRevision in revision.ts. OPEN, author, head, base, and head repo are as published.
const prHeld = (fields) =>
  Boolean(fields) &&
  fields.state === "open" &&
  fields.html_url === revisionUrl &&
  fields.user === actor &&
  fields.head_sha === revisionRow.commit &&
  fields.head_ref === revisionRow.branch &&
  fields.head_repo === repository &&
  fields.base_ref === baseBranch &&
  fields.base_repo === repository;
const startBodySha = String(target.revision_body_sha || "").trim();
if (revising && (!prHeld(parseJsonText(target.revision_pr)) || !DIGEST_SHAPE.test(startBodySha))) {
  return await stop(
    "revision-target-changed",
    `${revisionUrl} changed since it was published (OPEN, author, head, or base). Reconcile the changes stacked after publication, then relaunch with a new revision request.`,
  );
}

// ---- Prepare: cut an isolated worktree and branch from the base, then run setup ----
phase("Prepare");
// The branch name is skills/checkout/references/branch-naming.md's <type>/<scope>-<description>.
// The type comes from the Issue title's prefix, and the description is built deterministically
// from the title's alphanumeric words.
const TYPE_BY_PREFIX = { bug: "fix", feature: "feat", docs: "docs", chore: "chore" };
const titlePrefix = (/^\[(\w+)\]/.exec(issue.title) || [])[1] || "";
const branchType = TYPE_BY_PREFIX[titlePrefix.toLowerCase()] || "feat";
const titleWords = issue.title
  .replace(/^\[\w+\]\s*/, "")
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter(Boolean)
  .slice(0, 4);
// A title with fewer than two alphanumeric words (a Japanese title, for example) cannot reach 2-4 words.
// Only then does an agent propose an English description once, and the script checks its shape. A reply
// outside the shape falls back to the title's own words.
const isDescription = (value) => {
  const words = String(value).split("-");
  return words.length >= 2 && words.length <= 4 && words.every((w) => /^[a-z0-9]+$/.test(w));
};
const named =
  revising || titleWords.length >= 2
    ? null
    : await agent(
        `Decide the description part of a branch name from the Issue title and put it in description. Do not run any command. ` +
          `Join 2-4 lowercase English words with hyphens, naming the target and the result (for example, highlight-search-match). Avoid vague words such as update.\n` +
          `Title: ${JSON.stringify(issue.title)}`,
        {
          label: "name",
          phase: "Prepare",
          agentType: "general-purpose",
          schema: closed({ description: str }),
          model: "haiku",
        },
      );
const description =
  named && isDescription(named.description) ? named.description : titleWords.join("-") || "issue";
// A revision keeps the published branch.
const branch = revising ? revisionRow.branch : `${branchType}/${issueNumber}-${description}`;
const worktree = `${repo}/.claude/worktrees/implement-${issueNumber}`;
const where = { branch, worktree };

const headSha = String(target.head_sha || "").trim();
if (!revising && !/^[0-9a-f]{40}$/.test(headSha)) {
  return await stop("target-unavailable", "Could not read the checkout's HEAD.", where);
}
// Canonical source: research-handoff.ts. The start commit equals the checkout's HEAD for a fresh run, and the PR-wide base for a revision.
const expectedStart = revising ? revisionRow.base_sha : headSha;
if (startCommit && startCommit !== expectedStart) {
  return await stop(
    "start-commit-mismatch",
    `Start commit ${startCommit} differs from the ${revising ? "PR-wide base" : "checkout's HEAD"} ${expectedStart}. Reconcile the reviewed references with the version that runs.`,
    where,
  );
}
// Each reference is a regular file at the start commit with the reviewed blob. Returns the paths that do not match.
// The form of a path in git ls-tree output. A path with non-ASCII bytes, quotes, backslashes, or control characters
// is quoted with its UTF-8 bytes escaped in octal (core.quotePath's default). A non-interactive session denies
// `git -c` at the permission check, so the listing keeps the default and is compared in this form.
const gitQuoted = (path) => {
  let quoted = false;
  const escape = (ch) => {
    const simple = { '"': '\\"', "\\": "\\\\", "\t": "\\t", "\n": "\\n" }[ch];
    if (simple) return simple;
    if (ch.charCodeAt(0) < 0x80) return ch;
    return encodeURIComponent(ch)
      .split("%")
      .slice(1)
      .map((hex) => `\\${Number.parseInt(hex, 16).toString(8)}`)
      .join("");
  };
  const body = [...path]
    .map((ch) => {
      const out = escape(ch);
      if (out !== ch) quoted = true;
      return out;
    })
    .join("");
  return quoted ? `"${body}"` : path;
};
const unmatchedReports = (listing) => {
  const pinned = new Map(
    String(listing || "")
      .split("\n")
      .map((line) => /^(\d{6}) blob ([0-9a-f]+)\s+(.+)$/.exec(line.trim()))
      .filter((m) => m && /^100(644|755)$/.test(m[1]))
      .map((m) => [m[3], m[2]]),
  );
  return reports.filter((r) => pinned.get(gitQuoted(r.path)) !== r.blob).map((r) => r.path);
};
const reportStop = (listing) => {
  const unmatched = unmatchedReports(listing);
  return unmatched.length
    ? stop(
        "report-mismatch",
        `References differ from their start-commit version (uncommitted, not a regular file, or changed since review): ${unmatched.join(", ")}`,
        where,
      )
    : null;
};
const earlyReportStop = revising ? null : reportStop(target.report_listing);
if (earlyReportStop) return await earlyReportStop;
// Canonical source: the README section on revising an existing PR. The earlier checkout (worktree) is reused at the published head with no tracked
// or untracked change. Nothing is stashed, reset, rebased, or carried over.
const revisionBase = revising ? revisionRow.base_sha : "";
// setup stops at the first non-zero exit. _setup carries whether to go on to the next command.
// A tail is returned only for a command that failed. A successful setup printed a download's progress bar, and
// the agent changed the count of its repeated character while returning it.
const setupSteps = (ready) =>
  config.setup.map((argv) => ({
    sh: argvLine(argv),
    cwd: worktree,
    timeout_ms: 570000,
    when: { ...ready, _setup: true },
    set: { _setup: "ok", setup_tail: "fail_tail:40" },
    append: { setup_exits: "exit" },
  }));
const freshSpec = {
  defaults: {
    existing: false,
    created: false,
    base_sha: "",
    config_blob: "",
    checkout_head: "",
    setup_exits: [],
    setup_tail: "",
    _setup: true,
  },
  steps: [
    {
      sh: `git show-ref --verify --quiet ${shq(`refs/heads/${branch}`)} || test -e ${shq(worktree)}`,
      cwd: repo,
      set: { existing: "ok" },
    },
    {
      sh: `git worktree add -b ${shq(branch)} ${shq(worktree)} ${shq(headSha)}`,
      cwd: repo,
      when: { existing: false },
      set: { created: "ok" },
    },
    {
      sh: `git -C ${shq(worktree)} rev-parse HEAD`,
      cwd: repo,
      when: { created: true },
      set: { base_sha: "out" },
    },
    {
      sh: `git -C ${shq(worktree)} rev-parse HEAD:.dotagents.json`,
      cwd: repo,
      when: { created: true },
      set: { config_blob: "out" },
    },
    ...setupSteps({ created: true }),
    { sh: "git rev-parse HEAD", cwd: repo, when: { created: true }, set: { checkout_head: "out" } },
  ],
};
const revisionSpec = {
  defaults: {
    existing: false,
    created: false,
    wt_status: "",
    wt_branch: "",
    head: "",
    config_blob: "",
    base_config_blob: "",
    report_listing: "",
    setup_exits: [],
    setup_tail: "",
    _setup: true,
  },
  steps: [
    { sh: `test -e ${shq(worktree)}`, cwd: repo, set: { existing: "ok" } },
    {
      sh: `git worktree add ${shq(worktree)} ${shq(branch)}`,
      cwd: repo,
      when: { existing: false },
      set: { created: "ok" },
    },
    // Only whether the worktree is clean is read, so the first lines are enough.
    {
      sh: `git -C ${shq(worktree)} status --porcelain --untracked-files=all | head -20`,
      cwd: repo,
      set: { wt_status: "out" },
    },
    {
      sh: `git -C ${shq(worktree)} rev-parse --abbrev-ref HEAD`,
      cwd: repo,
      set: { wt_branch: "out" },
    },
    { sh: `git -C ${shq(worktree)} rev-parse HEAD`, cwd: repo, set: { head: "out" } },
    {
      sh: `git -C ${shq(worktree)} rev-parse HEAD:.dotagents.json`,
      cwd: repo,
      set: { config_blob: "out" },
    },
    {
      sh: `git -C ${shq(worktree)} rev-parse ${shq(`${revisionBase}:.dotagents.json`)}`,
      cwd: repo,
      set: { base_config_blob: "out" },
    },
    ...(reports.length
      ? [
          {
            sh: argvLine(["git", "-C", worktree, "ls-tree", revisionBase, "--", ...reports.map((r) => r.path)]),
            cwd: repo,
            set: { report_listing: "out" },
          },
        ]
      : []),
    ...setupSteps({}),
  ],
};
const prepared = await relay(
  revising ? "reprepare" : "prepare",
  "Prepare",
  revising ? revisionSpec : freshSpec,
);
if (!prepared) {
  return await stop(
    "prepare-unavailable",
    "The agent preparing the worktree returned no result.",
    where,
  );
}
if (!revising && prepared.existing) {
  return await stop(
    "branch-exists",
    "A branch or worktree of the same name already exists. Reconcile the earlier run. This workflow neither reuses nor deletes it.",
    where,
  );
}
const worktreeReady = revising
  ? prepared.existing || prepared.created
  : prepared.created && /^[0-9a-f]{40}$/.test(prepared.base_sha);
if (!worktreeReady) {
  return await stop("worktree-failed", "Could not create the worktree and branch.", where);
}
recordedBranch = branch;
// Canonical source: "Start HEAD changed during preparation" in orchestrator.ts.
if (
  !revising &&
  (prepared.base_sha !== headSha || String(prepared.checkout_head).trim() !== headSha)
) {
  return await stop(
    "start-head-changed",
    "The checkout's HEAD moved during preparation, so the validated config and the version that runs no longer match. Check HEAD, then relaunch.",
    where,
  );
}
const reusedHeld =
  !String(prepared.wt_status || "").trim() &&
  String(prepared.wt_branch || "").trim() === branch &&
  String(prepared.head || "").trim() === (revising ? revisionRow.commit : "");
if (revising && !reusedHeld) {
  return await stop(
    "revision-worktree-mismatch",
    `The earlier worktree ${worktree} is not clean at the published head ${revisionRow.commit} on ${branch}. Reconcile the worktree, then relaunch. This workflow does not move changes.`,
    where,
  );
}
if (revising && String(prepared.config_blob).trim() !== String(prepared.base_config_blob).trim()) {
  return await stop(
    "config-changed",
    ".dotagents.json changed within the PR from its base. Check the target's setup, check, and capture contract, then relaunch.",
    where,
  );
}
const lateReportStop = revising ? reportStop(prepared.report_listing) : null;
if (lateReportStop) return await lateReportStop;
// The PR-wide base (the review diff's and the capture's baseline). For a revision it is the earlier start commit, and the published head becomes the new commit's parent.
const baseSha = revising ? revisionRow.base_sha : prepared.base_sha;
published.base_sha = baseSha;
const setupExits = prepared.setup_exits || [];
if (setupExits.length !== config.setup.length || setupExits.some((code) => code !== 0)) {
  return await stop(
    "setup-failed",
    `Setup did not complete (exit codes ${JSON.stringify(setupExits)}).`,
    {
      ...where,
      setup_tail: prepared.setup_tail,
    },
  );
}

// ---- Implement: implement the whole agreed Issue in one implementation pass ----
phase("Implement");
const requirements = `Title: ${issue.title}\n\n${issue.body}`;
const inTree = (p) =>
  `Work only inside the worktree at ${worktree}. Begin each shell command with \`cd ${worktree} && \` and edit files under that path only.\n\n${p}`;
// Canonical source: repairInstructions in ~/.agents/scripts/implement/repair.ts. The capture lines depend on whether capture is set.
const CAPTURE_RULES = capture
  ? [
      `Prepare the configured capture command and required media for this Issue. Reference final media at ${capture.destination}/.`,
      "The host runs capture separately from normal tests. Its command receives the absolute output directory as the final argument. Save only PNG/JPEG/WebP/MP4/WebM files directly under that directory (CAPTURE_OUTPUT for browser definitions). Close video contexts and save video there. Do not write media or reports into the checkout during capture.",
    ]
  : [
      "This target declares no capture. If the agreed Issue needs media, return needs_human to configure required capture before execution.",
    ];
const TESTING_RULE = `When the change alters an async UI's E2E test, an external-input boundary, a path after a failure, how a target's version is re-read, or what a check counts as success, run \`cat ${bundled("skills/implement/references/testing.md")}\` and apply the matching case. Otherwise do not read it.`;
const REPAIR_RULES = [
  TESTING_RULE,
  "Before creating or updating tests, apply the target test policy when present and these common test criteria. Ask what realistic bug deleting each relevant test would miss. Compare its additional assurance with runtime, flakiness and maintenance cost; actively remove or consolidate tests that do not justify that cost. Do not retain tests merely for reassurance, test counts or coverage metrics. Explain any lost detection conditions and the remaining verification.",
  "In findings, explain the concrete bugs prevented by verification affected by this change, what it adds beyond existing verification, and why tests were added, retained, consolidated or removed. State lost detection conditions, remaining verification and unverified limits. Reuse sufficient existing tests; do not create a per-test ledger.",
  "Apply the target documentation policy when present to documentation-only changes and accompanying updates; keep current operating instructions accurate and historical results in evidence. Compare document facts, quantities, conditions, scope, authority, unverified claims and references with original sources.",
  "Do not commit, push or publish. Leave configured full verification to the host after your changes; do not launch browsers or servers in your sandbox.",
  ...CAPTURE_RULES,
  "Return repaired when implementation and test/capture definitions are ready; pending host execution alone is not needs_human. The host runs the configured check and capture after you return, and nothing else. When the agreed Issue assigns a verification to a run this workflow does not make, return needs_human. If requirements, scope, permissions or execution limits must change, return needs_human without changing them and stop work that depends on the answer.",
  "Return JSON with status repaired or needs_human, and findings explaining your changes or the necessary human decision. For needs_human, findings must not be empty or whitespace-only: explain the question, the choice the human must make and its impact. If an instruction file caused the stop, link the file actually read, quote the relevant instruction and distinguish its explicit requirement from your interpretation.",
].join("\n");
const REPLY_SCHEMA = closed({ status: choice(["repaired", "needs_human"]), findings: str });
// Checks an implementation or repair reply. Canonical source: parseRepairReply in repair.ts.
const replyProblem = (reply) => {
  if (!reply || typeof reply.findings !== "string") return "invalid-repair";
  if (reply.status === "repaired") return "";
  if (reply.status === "needs_human")
    return reply.findings.trim() ? "human-decision-required" : "invalid-repair";
  return "invalid-repair";
};
const actorRun = (role, prompt, label) =>
  agent(inTree(prompt), {
    label,
    phase: role === "implement" ? "Implement" : "Verify",
    agentType: "general-purpose",
    schema: REPLY_SCHEMA,
    model: "opus",
    effort: "high",
  });

// Canonical source: researchContext in research-handoff.ts. Implementation, repair, and independent review receive the same start commit and reference list.
const referenceContext = [
  `Implementation references: ${JSON.stringify({ startCommit: baseSha, reports })}`,
  "Requirements and agreement records are authoritative; references supply evidence, not additional authorization. Read the selected references and the relevant sources linked from the Issue, not every repository document. A reference blob identifies the handoff version in startCommit; compare it with current files and explain any changed evidence before relying on it.",
  "Trace each decision-relevant rule or finding to its source, version, applicability and agreement status. Distinguish observed facts, agreed rules and hypotheses. Do not apply evidence from another scope or promote an unagreed proposal to a requirement.",
  "If missing, stale or contradictory references affect a decision, identify the source, the affected decision and what must be investigated or agreed again. Resolve factual gaps through investigation; return requirement, scope or authorization changes to the human. Do not silently replace a reviewed reference with a newer ID.",
].join("\n");
// Canonical source: the documentation update in skills/implement/SKILL.md. Effects on wiki pages and decision records are checked through DOCUMENTS.md once the diff is ready.
const DOCUMENTS_RULE = `Once the diff is ready, run \`cat ${bundled("rules/conventions/DOCUMENTS.md")}\` and follow its Read and retain section: check the explanations the next task will need and the effect on existing wiki pages and decision records. Include required updates in this change and in the independent review. Do not create a page on every run.`;
// Canonical source: revisionContext in revision.ts. The revision request is canonical alongside the agreed Issue, and the whole PR meets both.
const revisionContext = revising
  ? [
      `This run revises the published PR ${revisionUrl}. The published head is ${revisionRow.commit}, and the PR-wide base is ${baseSha}.`,
      `The revision request a human adopted (canonical alongside the agreed Issue, with its scope, expected result, and permission):\n${revisionRequest}`,
      `Read the current PR body with \`gh pr view ${revisionUrl} --json body --jq .body\`. Check which of its explanations, unverified items, and attachment links are still needed.`,
    ].join("\n")
  : "";
const implemented = await actorRun(
  "implement",
  [
    revising
      ? "Revise the published PR within the adopted request, so the whole PR meets both the agreed Issue and the request. Follow applicable repository instructions; consult the target README and development policy sections relevant to this change."
      : "Implement the complete agreed Issue using existing code and verification assets. Follow applicable repository instructions; consult the target README and development policy sections relevant to this change.",
    revisionContext,
    referenceContext,
    DOCUMENTS_RULE,
    "Complete the agreed implementation, needed tests and documentation, and targeted checks needed to prepare it for host verification without pausing for approval of routine choices within scope; reuse sufficient existing verification. Do not change the Issue or weaken acceptance criteria.",
    "Documentation-only Issues use the same flow; add tests or code only when the agreed requirements need them. Include changed documents in the existing independent review.",
    REPAIR_RULES,
    `Target setup/check/capture contract (do not weaken or replace): ${JSON.stringify({ setup: config.setup, check: config.check, capture })}`,
    "Do not edit control scripts or credentials outside this worktree.",
    `Requirements:\n${requirements}`,
    `Issue: ${issue.url}`,
  ].join("\n"),
  "implement",
);
const implementProblem = replyProblem(implemented);
if (implementProblem) {
  return await stop(
    implementProblem,
    (implemented && implemented.findings) || "The implementation agent returned no valid reply.",
    where,
  );
}

// ---- Verify: loop capture -> check -> independent review -> repair until accepted (no round cap, dotagents #155) ----
phase("Verify");
const TREE_SHAPE = /^[0-9a-f]{40}$/;
const stageTree = `git -C ${shq(worktree)} add -A && git -C ${shq(worktree)} write-tree`;
// The worktree's .dotagents.json at the start. Canonical source: unchangedTarget in orchestrator.ts, which catches an agent editing the config.
const baseConfigBlob = String(prepared.config_blob || "").trim();
// Observes the requirements (the Issue's digest), the deliverable (the worktree's tree id), and the config (the staged .dotagents.json blob) at once.
const snapshot = async (label, stage = "Verify", mark = "") => {
  const snap = await relay(
    label,
    stage,
    {
      defaults: { issue_digest: "", tree: "", config_blob: "" },
      steps: [
        {
          sh: issueDigestCommand(` --repo ${shq(repository)}`),
          cwd: repo,
          set: { issue_digest: "out" },
        },
        { sh: stageTree, cwd: repo, timeout_ms: 60000, set: { tree: "out" } },
        {
          sh: `git -C ${shq(worktree)} rev-parse :.dotagents.json`,
          cwd: repo,
          set: { config_blob: "out" },
        },
      ],
    },
    { extra: mark },
  );
  return snap && { ...snap, configHeld: String(snap.config_blob).trim() === baseConfigBlob };
};
const requirementsHeld = (snap) => Boolean(snap) && snap.issue_digest === issueDigest;
// A failed observation (the agent returned nothing, or the digest could not be read) stops apart from a
// change in the requirements.
const observed = (snap) => Boolean(snap) && DIGEST_SHAPE.test(String(snap.issue_digest).trim());
const UNOBSERVED = "Could not observe the Issue and the tree. Check the execution environment.";
const history = [];
// Turns a host check or capture failure into evidence for the repair agent, with the previous review attached as history when one exists.
const hostFailure = (message) =>
  [
    message,
    history.length
      ? `Previous independent review (historical; verify current artifacts):\n${reviewSummary(history)}`
      : "",
  ].join("\n");

// ---- Capture: canonical source is verifyHost and captureDecision in correction.ts ----
// {harness} expands to workflows/implement/harness, a vendored copy of the Codex harness's capture adapter (scripts/capture, scripts/shared), so a capture runs without ~/.agents. The layout stays the same as the Codex harness's, so a target's `bun {harness}/scripts/capture/capture.ts` command resolves in both.
const captureArg = (arg) => arg.split("{harness}").map(shq).join('"$H"');
const captureLine = (argv) => argv.map(captureArg).join(" ");
// Definition files in the checkout that the capture command's arguments point at directly. A change to one forces a recapture, whatever its extension.
const captureDefinitions = capture
  ? capture.command
      .filter((arg) => !arg.includes("{harness}"))
      .map((arg) =>
        arg.startsWith("-") && arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : arg,
      )
      .filter((arg) => arg && !arg.startsWith("-"))
      .map((arg) => arg.replace(/^\.\//, ""))
  : [];
const destinationDir = capture ? capture.destination.replace(/\/+$/, "") : "";
const recordPrefix = destinationDir.includes("/")
  ? `${destinationDir.slice(0, destinationDir.lastIndexOf("/"))}/`
  : "";
// Saved records in the destination's parent directory (excluding the destination), treated as a place that capture does not read from.
// A destination at the repo root has no such parent, the same as Codex's dirname(destination) of ".".
const isRecordFile = (path) =>
  recordPrefix !== "" &&
  /\.(json|txt|log|stdout|stderr|diff)$/.test(path) &&
  path.startsWith(recordPrefix) &&
  !path.startsWith(`${destinationDir}/`);
const DIFF_LINE = /^:(\d{6}) (\d{6}) [A-Z]\d* (.+)$/;
const PLAIN_MODE = /^(000000|100644)$/;
// Whether the changes are only regular files that capture does not read (Markdown, plus saved records after the first capture).
// A symlink, an executable-bit or capture-definition change, or a line that cannot be classified forces a recapture.
const onlyNonRendering = (raw, allowRecords) => {
  const lines = String(raw).split("\n").filter(Boolean);
  return (
    lines.length > 0 &&
    lines.every((line) => {
      const m = DIFF_LINE.exec(line);
      if (!m || !PLAIN_MODE.test(m[1]) || !PLAIN_MODE.test(m[2])) return false;
      if (captureDefinitions.includes(m[3])) return false;
      return m[3].endsWith(".md") || (allowRecords && isRecordFile(m[3]));
    })
  );
};
// The decision reads every line, so the step returns what the decision reads (both modes, the status, the path)
// and counts the lines before it limits them. The count is the first line. A diff that does not come back whole
// always captures.
const DIFF_LINES = 200;
const DIFF_CHARS = 20000;
const treeDiff = (from, to, label) =>
  relay(label, "Verify", {
    defaults: { exit_code: -1, raw: "" },
    steps: [
      {
        sh: `out=$(git -C ${shq(worktree)} diff-tree -r --no-renames ${shq(from)} ${shq(to)}) && { printf %s "$out" | grep -c ''; printf '%s\\n' "$out" | cut -d ' ' -f 1,2,5- | tr '\\t' ' ' | awk 'NR > ${DIFF_LINES} { exit } { n += length($0) + 1 } n > ${DIFF_CHARS} { exit } { print }'; }`,
        cwd: repo,
        set: { exit_code: "exit", raw: "out" },
      },
    ],
  });
let lastCaptureTree = "";
let lastCapture = null;
// Decides whether to capture: reuse on the same tree; with required: false, a documentation-only change needs no capture or reuses one; anything else captures.
const captureDecision = async (tree) => {
  if (lastCaptureTree === tree) return "reused";
  if (capture.required) return "execute";
  const from = lastCaptureTree || `${baseSha}^{tree}`;
  const diff = await treeDiff(from, tree, `capture-diff:${counts.check_runs + 1}`);
  // The first line is how many lines the diff has. Fewer lines than that came back cut short.
  const [count, ...rest] = diff ? String(diff.raw).split("\n") : [];
  const listed = rest.filter(Boolean);
  if (
    !diff ||
    diff.exit_code !== 0 ||
    listed.length !== Number(count) ||
    !onlyNonRendering(listed.join("\n"), Boolean(lastCaptureTree))
  )
    return "execute";
  return lastCaptureTree ? "reused" : "not_required";
};
// Moves aside what an earlier capture left: the output directory and the three paths the harness creates
// next to it. With them in place mkdir fails, and both a resume of the stopped run and a fresh launch after
// the earlier branch was cleared stop at the capture. Nothing is deleted.
const staleAside = (output) =>
  `for p in ${["", ".artifacts", ".config.mjs", ".report.json"].map((ext) => shq(`${output}${ext}`)).join(" ")}; do [ ! -e "$p" ] || mv "$p" "$p.stale-$(date +%s)-$$"; done`;
const HARNESS = `H=${bundled("workflows/implement/harness")}`;
const runCapture = (output, label) =>
  relay(label, "Verify", {
    defaults: { started: false, timed_out: false, exit_code: -1, log_tail: "", tree: "" },
    steps: [
      {
        sh: `${HARNESS} && test -d "$H/scripts" && ${staleAside(output)} && mkdir ${shq(output)}`,
        set: { started: "ok", log_tail: "fail_tail:80" },
      },
      {
        sh: `${HARNESS} && ${captureLine([...capture.command, output])}`,
        cwd: worktree,
        timeout_ms: 570000,
        when: { started: true },
        set: { exit_code: "exit", timed_out: "timed_out", log_tail: "fail_tail:80" },
      },
      { sh: stageTree, cwd: repo, timeout_ms: 60000, set: { tree: "out" } },
    ],
  });
const installMedia = (output, label) =>
  relay(label, "Verify", {
    defaults: { stdout: "", tree: "" },
    steps: [
      {
        sh: `${RUNTIME} ${bundled("workflows/implement/install-media.ts")} ${shq(output)} ${shq(worktree)} ${shq(capture.destination)}`,
        cwd: repo,
        set: { stdout: "out" },
      },
      { sh: stageTree, cwd: repo, timeout_ms: 60000, set: { tree: "out" } },
    ],
  });
// Decides a stop from a capture run. Exit code 78 is the value the Codex capture adapter uses for "cannot start".
const shotStop = (shot, tree) => {
  if (!shot)
    return {
      stop: "capture-unavailable",
      why: "The agent running the capture returned no result.",
    };
  if (shot.timed_out)
    return { stop: "capture-timeout", why: `The capture timed out.\n${shot.log_tail}` };
  if (!shot.started || shot.exit_code === 78)
    return { stop: "capture-unavailable", why: `The capture could not start.\n${shot.log_tail}` };
  if (shot.tree !== tree)
    return {
      stop: "source-changed",
      why: "The worktree changed during the capture. The capture does not write into the checkout.",
    };
  return null;
};
const captureStep = async (tree) => {
  if (!capture) return {};
  if (!TREE_SHAPE.test(String(tree)))
    return { stop: "check-unavailable", why: "Could not get the tree id." };
  const decision = await captureDecision(tree);
  if (decision !== "execute") {
    lastCapture = { ...lastCapture, decision };
    return {};
  }
  lastCaptureTree = "";
  counts.captures += 1;
  const output = `${worktree}-capture-${counts.captures}`;
  const shot = await runCapture(output, `capture:${counts.captures}`);
  const stopped = shotStop(shot, tree);
  // Only a stop whose tree after the capture is confirmed equal to the tree before it can be resumed. A
  // tree that cannot be confirmed would be taken in as the deliverable by the next observation.
  if (stopped) return { ...stopped, resumable: Boolean(shot) && shot.tree === tree };
  if (shot.exit_code !== 0)
    return {
      evidence: hostFailure(
        `The host capture failed with exit code ${shot.exit_code}. The end of its output:\n${shot.log_tail}`,
      ),
    };
  const installed = await installMedia(output, `install:${counts.captures}`);
  const result = installed ? parseJsonText(installed.stdout) : null;
  if (!result || !result.ok) {
    const reason = (result && result.reason) || "Could not get the media install result.";
    return {
      stop: reason === "ignored" ? "capture-media-ignored" : "invalid-capture",
      why: reason,
    };
  }
  if (!TREE_SHAPE.test(String(installed.tree)))
    return { stop: "check-unavailable", why: "Could not get the tree id after installing media." };
  lastCaptureTree = installed.tree;
  lastCapture = { decision, files: result.files, output };
  return {};
};

const runCheck = (label) =>
  relay(label, "Verify", {
    defaults: { exit_code: -1, log_tail: "", tree: "" },
    steps: [
      {
        sh: argvLine(config.check),
        cwd: worktree,
        timeout_ms: 570000,
        set: { exit_code: "exit", log_tail: "fail_tail:80" },
      },
      { sh: stageTree, cwd: repo, timeout_ms: 60000, set: { tree: "out" } },
    ],
  });

// Canonical source: reviewSchema in ~/.agents/scripts/implement/review.ts. The host assigns the ID, the first target, and the disposition.
const REVIEW_SCHEMA = closed({
  findings: text,
  targetId: text,
  assessments: closed({ code: text, requirements: text, tests: text, documentation: text }),
  updates: list(
    closed({ id: text, disposition: choice(["open", "fixed", "not_applicable"]), reason: text }),
  ),
  newItems: list(
    closed({
      kind: choice(["defect", "concern"]),
      area: choice(["code", "requirements", "tests", "documentation"]),
      required: bool,
      location: closed({
        path: { type: ["string", "null"] },
        line: { type: ["integer", "null"] },
      }),
      condition: text,
      impact: text,
      evidence: text,
      action: text,
      reason: text,
    }),
  ),
  documents: list(
    closed({ path: text, role: choice(["current", "historical", "proposal"]), reason: text }),
  ),
  handoff: list(text),
});
// Canonical source: reviewInstructions in review.ts. The lines about knowledge nodes and the PR
// publication split are not carried over, since this workflow handles neither.
const REVIEW_RULES = [
  "Independently review the current deliverables on every initial review and re-evaluation. Read the current diff AND affected callers and callees, shared types, state transitions, error handling and relevant tests. Adjudicate previous items while also checking the current related paths for recurring or new concrete problems; fixing previous items alone is not grounds for acceptance. Do not audit unrelated code or demand out-of-scope features or stylistic preferences.",
  "Assess four separate dimensions: code correctness (input boundaries, state updates, async behavior and failure side effects) and concrete redundancy; agreed Issue requirements and scope; realistic test detection; required documentation and evidence consistency with the implementation version.",
  "Report code defects even when the Issue does not explicitly enumerate the behavior. Distinguish demonstrated defects from unverified concerns. Neither no findings nor passing check guarantees absence of defects.",
  "For change-related redundancy, expand affected helper calls to the reads and checks they perform. For each repeated observation, identify the intervening operation or distinct guarantee requiring another fresh result. Similar appearance, brevity, line counts and preference alone are not findings. Zero findings is valid.",
  "Mark demonstrated redundancy required when its target, conditions and waste are established and a local repair within the agreed scope can preserve necessary guarantees; return it through the repair loop for resolution before publication. Do not use a size or severity quota. Unclear benefit, preference alone or out-of-scope redesign is not a required redundancy fix.",
  "Read the target test policy. Ask what realistic bug deleting each relevant test would miss, weigh assurance against runtime, flakiness and maintenance, and detect copied expectations or negative tests passing for the wrong reason. Justified deletion or consolidation is not a defect merely because counts decrease.",
  "Apply the target documentation policy, including documentation-only changes. Compare changed documents with the Issue, original sources, code and check results, including facts, quantities, conditions, scope, authority, unverified claims and references. Distinguish current policy, historical evidence and unadopted proposals. When media was captured, confirm that what it captured corresponds to the current code.",
  "A decision-blocking gap or contradiction is a required open finding with the affected decision and return path in action. Human decisions cannot be resolved by the reviewer.",
  "Compare implementation premises with the Issue and the references (Implementation references) at their handoff versions. In the requirements and documentation assessments, explain relevant applicability, agreement and changed evidence. Trace contradictory observations through their sources to the affected premise and Issue decision. A decision-blocking gap or contradiction is a required open finding, not an accepted handoff task.",
  "Do not edit files or run the full check. The host check result is in the host context. Use current artifacts and necessary targeted verification to adjudicate findings; do not trust repair self-reports.",
  "Read repairsSinceReview in the host context in order: the additional repairs completed since the previous independent review (or since execution began for the initial review), including repairs followed by failed checks. Follow each entry's evidence, changes and reasons for leaving artifacts unchanged. Treat repair explanations as claims to investigate, never as automatic fixed or accepted judgments; independently reassess every previous item against current evidence. An empty repairsSinceReview is valid for an initial review.",
  "The PR body publishes assessments, current item reasons (also condition/impact/action for open items), document reasons and handoff. Assign each explanation one home: code explains the concrete change and why; requirements maps it to agreed behavior; tests states actual verification and limits; documentation explains source applicability, versions, agreement and changed premises. Do not repeat the same change, conclusion or caveat across assessments. For fixed or not_applicable findings, reason is the complete public response: identify the relevant problem and conditions, and the current resolution or non-applicability and its basis.",
  // Canonical source: the PR generator line and the redundancy line of reviewInstructions in review.ts. These sentences
  // were dropped in the port, and a re-evaluation wrote its assessments as the difference from the previous review, which
  // went into the PR body as they were.
  "In the published fields (assessments, item reasons, document reasons, handoff), do not retell the history of review and repair iterations. assessments.code explains the final change and why, without repeating the history of the findings. Do not copy the response to a finding into the assessments. Put raw logs, references to host records, and the history of iterations in findings and the internal record. Keep the full internal evaluation and finding history.",
  "Return the review JSON schema. Echo targetId from the host context. Give substantive reasons in all four assessments, including applicability. findings is the overall summary. Return updates and newItems, not status or items; the host computes status from required open findings.",
  "Each newItems entry needs kind, area, required, location, condition, impact, evidence, action, and reason. Omit id, introducedIn and disposition. Use null path/line when no real code location exists. Never invent locations or reproduction runs.",
  "Return exactly one updates entry for EVERY previous item ID, including already resolved items, with only id, disposition (open, fixed, not_applicable) and reason. On the first review updates is empty. Explain concrete evidence for fixes or non-applicability, not merely an implementer claim. Reopen when needed. Keep unresolved required items open.",
  "List principal repository documents actually consulted in documents, with their repository-relative path, role current/historical/proposal and reference reason. A path must be a regular file in the reviewed tree; the host checks it.",
  "The host alone adds routine publication/upload/CI tasks, the assigned AI's comparison of the public body and its rendered-media checks, and human review/approval/merge to the PR body according to execution conditions. Do not repeat them in handoff or other public-facing fields. Their pending status before publication is not an implementation defect. Limit handoff to Issue-specific unverified conditions, required follow-up and named owners; return [] when none remain.",
].join("\n");

const blankText = (value) => typeof value !== "string" || !value.trim();
const badLocation = (loc) =>
  !loc ||
  (loc.line !== null && (blankText(loc.path) || !Number.isInteger(loc.line) || loc.line < 1));
// Empty strings and the line-number range are checked here rather than in the schema, so acceptance
// does not rest on minLength and minimum, which no existing workflow has passed to agent().
const blankFields = (value) => {
  const problems = [];
  if (blankText(value.findings)) problems.push("findings");
  for (const key of ["code", "requirements", "tests", "documentation"]) {
    if (blankText(value.assessments && value.assessments[key])) problems.push(`assessments.${key}`);
  }
  for (const u of value.updates) if (blankText(u.reason)) problems.push(`updates[${u.id}].reason`);
  for (const [n, f] of value.newItems.entries()) {
    const missing = ["condition", "impact", "evidence", "action", "reason"].filter((k) =>
      blankText(f[k]),
    );
    if (missing.length) problems.push(`newItems[${n}].${missing.join("/")}`);
    if (badLocation(f.location)) problems.push(`newItems[${n}].location`);
  }
  return problems;
};
const idProblem = (prior, value) => {
  const ids = new Set(prior.map((item) => item.id));
  const updateIds = value.updates.map((u) => u.id);
  if (new Set(updateIds).size !== updateIds.length) return "Duplicate finding update ID";
  const unknown = updateIds.filter((id) => !ids.has(id));
  if (unknown.length) return `Unknown finding update ID: ${unknown.join(", ")}`;
  const omitted = prior.filter((item) => !updateIds.includes(item.id)).map((item) => item.id);
  if (omitted.length) return `Prior finding omitted: ${omitted.join(", ")}`;
  const paths = value.documents.map((d) => d.path);
  return new Set(paths).size === paths.length ? "" : "Duplicate document reference";
};
// Canonical source: parseReview in review.ts. status is computed from whether any required item is
// open, not taken from the reviewer's own report.
const mergeReview = (value, targetId, attempt, previous) => {
  if (
    !value ||
    !Array.isArray(value.updates) ||
    !Array.isArray(value.newItems) ||
    !Array.isArray(value.documents)
  ) {
    return { error: "The review reply is missing or lacks a required array" };
  }
  if (value.targetId !== targetId)
    return { error: `Review target mismatch: expected ${targetId}, got ${value.targetId}` };
  const prior = previous ? previous.items : [];
  const problem = idProblem(prior, value) || blankFields(value).join(", ");
  if (problem) return { error: problem };
  const updates = new Map(value.updates.map((u) => [u.id, u]));
  const items = [
    ...prior.map((item) => ({
      ...item,
      disposition: updates.get(item.id).disposition,
      reason: updates.get(item.id).reason,
    })),
    ...value.newItems.map((f, n) => ({
      ...f,
      id: `R${attempt}-${n + 1}`,
      introducedIn: targetId,
      disposition: "open",
    })),
  ];
  const open = items.some((item) => item.required && item.disposition === "open");
  const { findings, assessments, documents, handoff } = value;
  return {
    review: {
      status: open ? "needs_changes" : "accepted",
      findings,
      targetId,
      assessments,
      items,
      documents,
      handoff,
    },
  };
};
// Canonical source: reviewSummary in review.ts.
const reviewSummary = (entries) => {
  const current = entries.at(-1);
  if (!current) return "";
  const place = (item) =>
    `${item.location.path || "No file location"}${item.location.line === null ? "" : `:${item.location.line}`}`;
  return [
    current.findings,
    `Review target: ${current.targetId}`,
    ...Object.entries(current.assessments).map(([key, value]) => `${key}: ${value}`),
    ...current.documents.map((doc) => `Source: ${doc.path} (${doc.role}): ${doc.reason}`),
    ...current.items.map(
      (item) =>
        `${item.id} (${item.area}/${item.kind}, ${item.disposition}, required=${item.required}, target=${item.introducedIn}): ${place(item)}: ${item.condition}; impact: ${item.impact}; evidence: ${item.evidence}; action: ${item.action}; judgment: ${item.reason}`,
    ),
    ...current.handoff.map((action) => `Handoff: ${action}`),
    "Structured validation and passing checks do not guarantee absence of defects.",
  ].join("\n\n");
};

// The explanations of repairs completed since the previous independent review, including repairs
// followed by a failed check; a completed review empties it. Canonical source: repairsSinceReview in
// correction.ts. Reasons for leaving artifacts unchanged, and rebuttals, become material the next review checks itself.
let repairsSinceReview = [];
const CONFIG_CHANGED = {
  stop: "config-changed",
  why: "The worktree's .dotagents.json changed from its start version. An agent in the run does not change the target's setup, check, or capture contract.",
};
const TREE_ENTRY = /^(\d{6}) (\w+) [0-9a-f]+\s+(.+)$/;
// Canonical source: the document reference check in correction.ts. A document a review names must be a
// regular file in the reviewed tree; the PR body links to it, so a missing document is never published.
const missingDocuments = async (review, tree, attempt) => {
  const paths = review.documents.map((doc) => doc.path);
  if (!paths.length) return [];
  const listed = await relay(`documents:${attempt}`, "Verify", {
    defaults: { exit_code: -1, listing: "" },
    steps: [
      {
        sh: argvLine(["git", "-C", worktree, "ls-tree", tree, "--", ...paths]),
        cwd: repo,
        set: { exit_code: "exit", listing: "out" },
      },
    ],
  });
  if (!listed || listed.exit_code !== 0) return paths;
  const files = new Set(
    String(listed.listing)
      .split("\n")
      .map((line) => TREE_ENTRY.exec(line.trim()))
      .filter((m) => m && /^100(644|755)$/.test(m[1]))
      .map((m) => m[3]),
  );
  return paths.filter((path) => !files.has(gitQuoted(path)));
};
const reviewRound = async (checked) => {
  counts.review_rounds += 1;
  const attempt = counts.review_rounds;
  const previous = history.at(-1) || null;
  const hostContext = {
    targetId: checked.tree,
    attempt,
    worktree,
    baseCommit: baseSha,
    diff: `git -C ${worktree} diff --cached ${baseSha} (the host has staged every change)`,
    check: { command: config.check, exit_code: checked.exit_code },
    capture: lastCapture,
    previous,
    repairsSinceReview,
    revision: revising ? { pr: revisionUrl, publishedHead: revisionRow.commit } : null,
  };
  const response = await agent(
    inTree(
      [
        REVIEW_RULES,
        // Canonical source: revision.ts:236. The accepted review becomes the new public body, so what the previous body still needs is kept.
        revising
          ? "This run revises an existing PR. Review the whole PR from baseCommit against both the agreed Issue and the revision request. The accepted review assessments and handoff become the new public PR body. Compare the previous body with current artifacts and explicitly retain all still-applicable change explanations, unresolved limitations and public attachment links in those fields. Do not copy obsolete success claims or historical generated sections. Missing necessary context is needs_changes."
          : "",
        `Host context: ${JSON.stringify(hostContext)}`,
        `Requirements:\n${requirements}`,
        revisionContext,
        referenceContext,
      ].join("\n"),
    ),
    {
      label: `review:${attempt}`,
      phase: "Verify",
      agentType: "general-purpose",
      schema: REVIEW_SCHEMA,
      model: "opus",
      effort: "high",
    },
  );
  const after = await snapshot(`source:${attempt}`);
  if (!observed(after)) return { stop: "check-unavailable", why: UNOBSERVED };
  if (!requirementsHeld(after))
    return {
      stop: "requirements-changed",
      why: "The Issue (its title, body, state, or updatedAt, which a comment also moves) changed during the review. A human agrees on the changed requirements before a new run.",
    };
  if (!after.configHeld) return CONFIG_CHANGED;
  if (after.tree !== checked.tree)
    return {
      stop: "source-changed",
      why: "The worktree changed during the review. The reviewer does not edit files.",
    };
  const merged = mergeReview(response, checked.tree, attempt, previous);
  if (merged.error) return { stop: "invalid-review", why: merged.error };
  const missing = await missingDocuments(merged.review, checked.tree, attempt);
  if (missing.length)
    return {
      stop: "invalid-review",
      why: `The review names documents missing from the reviewed tree: ${missing.join(", ")}`,
    };
  // The completed review has read the repair explanations so far. A failed check has not.
  repairsSinceReview = [];
  return { review: merged.review };
};
// Runs the check and, when it passes, the review. Returns exactly one of a stop, repair evidence, or acceptance.
const checkAndReview = async () => {
  counts.check_runs += 1;
  const checked = await runCheck(`check:${counts.check_runs}`);
  if (!checked || !Number.isInteger(checked.exit_code) || !TREE_SHAPE.test(checked.tree)) {
    return {
      stop: "check-unavailable",
      why: "Could not get the check result or the tree id. Check the execution environment.",
    };
  }
  if (checked.exit_code !== 0) {
    return {
      evidence: hostFailure(
        `The host check \`${argvLine(config.check)}\` failed with exit code ${checked.exit_code}. The end of its output:\n${checked.log_tail}`,
      ),
    };
  }
  const round = await reviewRound(checked);
  if (round.stop) return round;
  history.push(round.review);
  if (round.review.status === "accepted")
    return { accepted: { review: round.review, tree: checked.tree } };
  return { evidence: reviewSummary(history) };
};
const repairPrompt = (evidence) =>
  [
    "Repair only within these agreed requirements. Read the current files and fix the root cause.",
    "When findings recur, compare the existing review records and prior repair results with the current artifacts, reassess the cause and repair approach, and continue required corrections within the agreed scope. Do not make out-of-scope improvements or preferences completion conditions.",
    "Return document content defects to repair and renew affected checks and independent review.",
    "Preserve agreed acceptance criteria and verification of required behavior; never hide realistic regressions to make checks pass.",
    "Run only targeted checks needed to diagnose or validate your repair.",
    REPAIR_RULES,
    `Requirements:\n${requirements}\nFailure evidence:\n${evidence}`,
    revisionContext,
    referenceContext,
  ].join("\n");

// The stops that resume from the start of the round once the cause is fixed. The round starts again from
// its observation, so the capture, the check, and the review all run against the current tree. A stop caused
// by the media or the config, and a stop for changed requirements or a changed tree, are left out.
const ROUND_RETRY = ["capture-unavailable", "capture-timeout", "check-unavailable", "invalid-review"];
// A repair may leave the tree as it was and give its reason, which the next review reads. When that round still
// does not accept the same tree, the repair and the review disagree, and another repair would change nothing
// again. One run repaired eleven times that way before its agent asked. The tree before the last repair, and
// what that repair said.
let treeBeforeRepair = "";
let lastRepair = null;
let accepted = null;
let roundNumber = 0;
while (!accepted) {
  roundNumber += 1;
  const roundKey = `round:${roundNumber}`;
  // Calls from here to the next round belong to this round and to this count of running it again.
  boundaryTag = `${roundKey}:${retryCount(roundKey)}`;
  const before = await snapshot(
    `requirements:${counts.check_runs + 1}`,
    "Verify",
    retryMark(roundKey),
  );
  if (!observed(before)) {
    return await stop("check-unavailable", UNOBSERVED, {
      ...where,
      review: history.at(-1) || null,
      retry_next: retryNext(roundKey),
    });
  }
  if (!requirementsHeld(before)) {
    return await stop(
      "requirements-changed",
      "The Issue (its title, body, state, or updatedAt, which a comment also moves) changed during the run. A human agrees on the changed requirements before a new run.",
      where,
    );
  }
  if (!before.configHeld) return await stop(CONFIG_CHANGED.stop, CONFIG_CHANGED.why, where);
  const idleRepair = lastRepair !== null && before.tree === treeBeforeRepair;
  const shot = await captureStep(before.tree);
  const step = shot.stop || shot.evidence ? shot : await checkAndReview();
  if (step.stop) {
    return await stop(step.stop, step.why, {
      ...where,
      review: history.at(-1) || null,
      retry_next:
        ROUND_RETRY.includes(step.stop) && step.resumable !== false ? retryNext(roundKey) : null,
    });
  }
  if (step.accepted) {
    accepted = step.accepted;
    break;
  }
  // The last repair changed nothing, and this round's check or review has now seen the same tree and its reason.
  if (idleRepair) {
    return await stop("repair-no-progress", "The last repair changed no file, and the round after it still does not accept the same tree. The repair and the review disagree, so a human decides: change the requirements or the scope, or tell the run what the repair could not do.", {
      ...where,
      review: history.at(-1) || null,
      findings: lastRepair.findings,
    });
  }
  // Canonical source: beforeRepair in correction.ts. A check can take minutes, so the Issue is checked again right before the repair.
  const beforeRepair = await snapshot(`before-repair:${counts.repairs + 1}`);
  if (!observed(beforeRepair)) {
    return await stop("check-unavailable", UNOBSERVED, {
      ...where,
      review: history.at(-1) || null,
      retry_next: retryNext(roundKey),
    });
  }
  if (!requirementsHeld(beforeRepair)) {
    return await stop(
      "requirements-changed",
      "The Issue (its title, body, state, or updatedAt, which a comment also moves) had changed right before the repair. A human agrees on the changed requirements before a new run.",
      { ...where, review: history.at(-1) || null },
    );
  }
  counts.repairs += 1;
  const repaired = await actorRun(
    "repair",
    repairPrompt(step.evidence),
    `repair:${counts.repairs}`,
  );
  const repairProblem = replyProblem(repaired);
  if (repairProblem) {
    return await stop(
      repairProblem,
      (repaired && repaired.findings) || "The repair agent returned no valid reply.",
      // Keep the open findings the human has to judge in the stopped result.
      { ...where, review: history.at(-1) || null },
    );
  }
  repairsSinceReview.push({ attempt: counts.repairs, findings: repaired.findings });
  treeBeforeRepair = beforeRepair.tree;
  lastRepair = repaired;
}

const verified = {
  issue: issue.url,
  actor,
  ...where,
  base_sha: baseSha,
  tree: accepted.tree,
  review: accepted.review,
  capture: lastCapture,
  summary: reviewSummary(history),
};
if (!publishing) {
  await recordRun("verified_local");
  return {
    status: "verified_local",
    why: "The local capture, check, and independent review accepted the current deliverables. Publishing is turned off.",
    ...verified,
    ...counts,
    run_id: runId,
    // Canonical source: remaining in orchestrator.ts. Publication and the human's judgment stay outside this workflow.
    remaining: [
      "commit",
      "publication",
      "ci",
      "published_body_check",
      "mark_ready",
      "human_review",
    ],
  };
}

// ---- Ship: canonical source is ship in orchestrator.ts and publish.ts. Check before writing, read back after every write ----
phase("Ship");
// A stop after publication starts returns the known commit and URL, so a human can reconcile them with GitHub's actual state.
const shipStop = (reason, why, fields = {}) =>
  stop(reason, why, {
    ...where,
    ...published,
    review: accepted.review,
    // Local verification is done. Before the PR's URL is known, publication remains too.
    remaining: [...(published.url ? [] : ["publication"]), ...REMAINING_AFTER_PR],
    ...fields,
  });
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// The body is never transcribed by an LLM; it is matched by digest (FNV-1a over UTF-16 code units, plus length).
// An agent rewrites characters over a transcription of a few KB, turning half-width kana into full-width, for example.
// Trailing whitespace carries no meaning and is not compared, since GitHub's storage can shift the final newline.
// The function's source is also embedded in node -e, so it uses no template literal.
const sameBody = (reported, text) => String(reported || "").trim() === digest(text);

// Calls from here on belong to Ship and to this count of running it again.
boundaryTag = `ship:${retryCount("ship")}`;
const gate = await snapshot("ship", "Ship", retryMark("ship"));
if (!observed(gate)) {
  return await shipStop("check-unavailable", UNOBSERVED, { retry_next: retryNext("ship") });
}
if (!requirementsHeld(gate)) {
  return await shipStop(
    "requirements-changed",
    "The Issue (its title, body, state, or updatedAt, which a comment also moves) changed after acceptance. A human agrees on the changed requirements before a new run.",
  );
}
if (!gate.configHeld) return await shipStop(CONFIG_CHANGED.stop, CONFIG_CHANGED.why);
if (gate.tree !== accepted.tree) {
  return await shipStop(
    "source-changed",
    "The worktree changed after acceptance. Publication needs a fresh check and independent review.",
  );
}

const owner = repository.split("/")[0];
// Only the fields the clash check reads are returned. A whole PR object is tens of KB, more than a Bash call returns
// with the rest of the relay's line.
const PULLS_JS =
  `const pages = JSON.parse(require("fs").readFileSync(0, "utf8")); ` +
  `const at = (o, k) => (o && typeof o === "object" ? o[k] : undefined); ` +
  `console.log(JSON.stringify(pages.map((page) => page.map((pr) => ({ html_url: at(pr, "html_url"), ` +
  `head: { ref: at(at(pr, "head"), "ref"), repo: { full_name: at(at(at(pr, "head"), "repo"), "full_name") } } })))))`;
const pulls = await relay("pulls", "Ship", {
  defaults: { actor: "", pulls_exit: -1, pulls_json: "" },
  steps: [
    { sh: "gh api user --jq .login", cwd: repo, set: { actor: "out" } },
    {
      // gh's output goes on only when gh succeeded. /bin/sh has no pipefail, and a failed gh page must not read as none.
      sh: `out=$(gh api ${shq(`repos/${repository}/pulls`)} --method GET -f state=open -f ${shq(`head=${owner}:${branch}`)} --paginate --slurp) && printf %s "$out" | node -e ${shq(PULLS_JS)}`,
      cwd: repo,
      set: { pulls_exit: "exit", pulls_json: "out" },
    },
  ],
});
if (!pulls || String(pulls.actor || "").trim() !== actor) {
  return await shipStop(
    "actor-changed",
    `The gh user changed from ${actor}. The run does not publish as another actor. Check the gh authentication.`,
  );
}
const pages = pulls.pulls_exit === 0 ? parseJsonText(pulls.pulls_json) : null;
if (!Array.isArray(pages) || !pages.every(Array.isArray)) {
  return await shipStop("pulls-unreadable", "Could not read the open PRs on this branch.");
}
const clash = pages.flat().find(
  (pr) =>
    pr &&
    pr.head &&
    pr.head.ref === branch &&
    pr.head.repo &&
    pr.head.repo.full_name === repository &&
    // In a revision, the PR being revised uses this branch itself.
    !(revising && pr.html_url === revisionUrl),
);
if (clash) {
  return await shipStop(
    "branch-pr-exists",
    `An open PR already uses this branch (${clash.html_url}). Reconcile it before publishing.`,
  );
}

// Canonical source: checkRevision in revision.ts. In a revision, before any write, the PR must be unchanged since the
// start; a ready PR is returned to draft and read back. Ready is never restored.
if (revising) {
  const current = await relay("revision-pr", "Ship", {
    defaults: { pr_fields: "", body_sha: "" },
    steps: [
      { sh: prFieldsCommand, cwd: repo, set: { pr_fields: "out" } },
      { sh: prBodyShaCommand, cwd: repo, set: { body_sha: "out" } },
    ],
  });
  const fields = current ? parseJsonText(current.pr_fields) : null;
  if (!current || !prHeld(fields) || String(current.body_sha).trim() !== startBodySha) {
    return await shipStop(
      "revision-target-changed",
      `The head, base, author, or body of ${revisionUrl} changed since this run started. The run does not overwrite someone else's change; a human decides how to incorporate it.`,
    );
  }
  if (fields.draft !== true) {
    const undone = await relay("undo-ready", "Ship", {
      defaults: { undo_exit: -1, is_draft: false },
      steps: [
        {
          sh: argvLine(["gh", "pr", "ready", revisionUrl, "--undo", "--repo", repository]),
          cwd: repo,
          set: { undo_exit: "exit" },
        },
        {
          sh: `test "$(${argvLine(["gh", "api", prApiPath, "--jq", ".draft"])})" = true`,
          cwd: repo,
          set: { is_draft: "ok" },
        },
      ],
    });
    if (!undone || undone.undo_exit !== 0 || undone.is_draft !== true) {
      return await shipStop(
        "publication-unconfirmed",
        `Could not confirm that ${revisionUrl} is back to draft. Check the PR's state on GitHub before any further write. Ready is not restored.`,
      );
    }
  }
}

const inWorktree = (...argv) => argvLine(["git", "-C", worktree, ...argv]);
// A resume of Ship runs this step once more. When the accepted change is already one commit on its parent,
// it does not commit again.
const commitParent = revising ? revisionRow.commit : baseSha;
const commitOnce = inWorktree("commit", "-m", `${issue.title} (#${issueNumber})`);
// A resume of Ship goes on only while the stopped run has pushed nothing. The script does not know where
// the earlier run stopped, so it checks the branch on the remote. A resume after a stop that followed the
// push would retry a write.
if (retryCount("ship")) {
  const remoteHead = await relay("pushed", "Ship", {
    defaults: { ls_exit: -1, remote_head: "" },
    steps: [
      {
        // The line is the commit and the ref with a tab between them. Only the commit is read, and an agent
        // returning a tab has written it as a backslash and a t.
        sh: `out=$(${inWorktree("ls-remote", remote, `refs/heads/${branch}`)}) && printf %s "$out" | cut -f 1`,
        cwd: repo,
        set: { ls_exit: "exit", remote_head: "out" },
      },
    ],
  });
  const pushedSha = String((remoteHead && remoteHead.remote_head) || "").trim().split(/\s+/)[0];
  if (!remoteHead || remoteHead.ls_exit !== 0 || pushedSha !== (revising ? revisionRow.commit : "")) {
    return await shipStop(
      "push-unconfirmed",
      `This branch is already on the remote before the resume (${pushedSha || "unreadable"}). The stopped run pushed. Do not retry until the actual state is confirmed.`,
    );
  }
}
const commitCommand = retryCount("ship")
  ? `{ ${inWorktree("diff", "--cached", "--quiet")} && [ "$(${inWorktree("rev-parse", "HEAD^")})" = ${shq(commitParent)} ] || ${commitOnce}; }`
  : commitOnce;
const committed = await relay("commit", "Ship", {
  defaults: { commit_exit: -1, commit: "", parent: "", tree: "", files: "" },
  steps: [
    {
      sh: `${inWorktree("add", "-A")} && ${commitCommand}`,
      cwd: repo,
      set: { commit_exit: "exit" },
    },
    { sh: inWorktree("rev-parse", "HEAD"), cwd: repo, set: { commit: "out" } },
    { sh: inWorktree("rev-parse", "HEAD^"), cwd: repo, set: { parent: "out" } },
    { sh: inWorktree("rev-parse", "HEAD^{tree}"), cwd: repo, set: { tree: "out" } },
    // The listing is read only for the media under the capture destination, so it is limited to that directory.
    ...(capture
      ? [
          {
            sh: inWorktree("diff-tree", "--no-commit-id", "--name-only", "--diff-filter=AM", "-r", "HEAD", "--", destinationDir),
            cwd: repo,
            set: { files: "out" },
          },
        ]
      : []),
  ],
});
if (!committed || committed.commit_exit !== 0 || !TREE_SHAPE.test(String(committed.commit))) {
  return await shipStop(
    "commit-failed",
    "Could not create the commit. Check the worktree and the hook output.",
  );
}
published.commit = committed.commit;
// A commit hook that rewrote the content, or a commit that is not the single one on the base, stops as a mismatch with the accepted tree.
// In a revision, the new commit's parent is the published head, not the PR-wide base.
if (
  committed.tree !== accepted.tree ||
  committed.parent !== commitParent
) {
  return await shipStop(
    "commit-mismatch",
    "The commit's tree or parent differs from the accepted tree on the base. This run does not rewrite the branch, so reconcile it before publishing.",
  );
}
const MEDIA_FILE = /\.(png|jpe?g|webp|mp4|webm)$/i;
const media = capture
  ? String(committed.files)
      .split("\n")
      .map((file) => file.trim())
      .filter((file) => file.startsWith(`${destinationDir}/`) && MEDIA_FILE.test(file))
  : [];

// Canonical source: publicText in pr-body.ts. Paths under the known local roots, and explicit filesystem notation outside them, are redacted.
const PATH_SUFFIX = /[A-Za-z0-9_./\\:@%+~=-]*/.source;
const OMITTED = "(internal path omitted)";
const publicText = (value) => {
  let result = String(value);
  for (const root of [worktree, repo]) {
    result = result.replace(
      new RegExp(`(?<![\\w/:])${escapeRegExp(root)}(?![\\w.-])${PATH_SUFFIX}`, "g"),
      OMITTED,
    );
  }
  return result.replace(
    new RegExp(`(?<![\\w/:])(?:file:///|~/|[A-Za-z]:\\\\)${PATH_SUFFIX}`, "g"),
    OMITTED,
  );
};
const docLink = (doc) =>
  `https://github.com/${repository}/blob/${published.commit}/${doc.path.split("/").map(encodeURIComponent).join("/")}`;
const itemLine = (item) =>
  item.disposition === "open"
    ? `- ${item.kind} / open: ${publicText(item.condition)} Impact: ${publicText(item.impact)} Judgment: ${publicText(item.reason)} Required action: ${publicText(item.action)}`
    : `- ${item.kind} / ${item.disposition}: ${publicText(item.reason)}`;
const MEDIA_TASKS = [
  `- Workflow: attach the media of the target commit (${media.join(", ")}).`,
  "- Assigned AI: on the actual PR page after attachment, confirm that the media displays or plays and matches its description and placement (rendered_media_check).",
];
// Canonical source: prBody in pr-body.ts. Only facts fit for publication are selected from the accepted review; the internal summary and history stay out.
const prBody = (review) =>
  [
    `Closes #${issueNumber}`,
    "## Changes and rationale",
    publicText(review.assessments.code),
    "## Requirements coverage",
    publicText(review.assessments.requirements),
    "## Verification and unverified items",
    `Target commit: ${published.commit}`,
    `Workflow: matched against the verified deliverable. The local check (${publicText(JSON.stringify(config.check))}) passed. Independent review: accepted.`,
    publicText(review.assessments.tests),
    ...(review.items.length ? ["## Findings and responses", ...review.items.map(itemLine)] : []),
    "## Documents and sources",
    publicText(review.assessments.documentation),
    ...review.documents.map(
      (doc) => `- [${doc.path}](${docLink(doc)}) (${doc.role}): ${publicText(doc.reason)}`,
    ),
    "## Remaining work and owners",
    "When this body was written, the draft publication, CI, the body and media checks, the switch to ready, and human approval were not complete.",
    `- Workflow: publish this PR as a draft and confirm that CI on the same head (${config.ciChecks.join(", ")}) registers and succeeds.`,
    ...(media.length ? MEDIA_TASKS : []),
    ...review.handoff.map((action) => `- ${publicText(action)}`),
    "- Assigned AI: compare the latest public body with the Issue, the target commit, the accepted review, and the verification results (published_body_check). After confirming the body, the required media, and CI on the same head, recheck, switch to ready, and read it back (mark_ready). Keep the draft while anything is unconfirmed.",
    "- Human: decide any change to requirements or permissions, and decide review, approval, and merge.",
  ].join("\n\n") + "\n";
const body = prBody(accepted.review);
// So a later revision can match the published body's version from the row.
published.body_digest = digest(body);
// The body lives outside the worktree (a sibling, like the capture output), so the committed tree stays clean.
const bodyFile = `${worktree}-pr.md`;
// The agent receives the body as UTF-8 base64. It turned \uXXXX escapes back into their characters
// while copying them and broke the shell quoting, so the payload takes a form the agent cannot read.
// The conversion runs inside the script, with no reliance on the runtime.
const utf8Bytes = (text) => {
  const bytes = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000)
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
  }
  return bytes;
};
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
// Wrapped at 76 characters a line. An agent copies a run of short lines more faithfully than one long line.
const base64Lines = (text) => {
  const bytes = utf8Bytes(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b, c] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[n >> 18] + B64[(n >> 12) & 63];
    out += b === undefined ? "=" : B64[(n >> 6) & 63];
    out += c === undefined ? "=" : B64[n & 63];
  }
  return out.match(/.{1,76}/g) || [];
};
// The function's source is embedded with its line breaks collapsed, so the agent's command stays on one line.
const DIGEST_SRC = String(digest).replace(/\s*\n\s*/g, " ");
const DIGEST_JS = `const digest = ${DIGEST_SRC}; console.log(digest(require("fs").readFileSync(process.argv[1], "utf8")))`;
// The body reaches its file in one of two ways. First an agent runs write-body.ts, which reads the body back from
// that agent's own prompt as Claude Code stored it in the transcript, so no character of the body passes through a
// model. An agent copying a few KB of base64 changed one or two characters, and the digest check stopped the run.
// Only when the read-back does not produce the generated body (the Codex runner, which keeps no transcript) does a
// second agent copy the heredoc. Which of the two wrote the file is decided here and not reported by a model.
const bodyData = ["PR_BODY_B64_BEGIN", ...base64Lines(body), "PR_BODY_B64_END"].join("\n");
const readBack = await relay(
  "body",
  "Ship",
  {
    defaults: { extract_exit: -1, extract_out: "", body_digest: "" },
    steps: [
      {
        sh: `${RUNTIME} ${bundled("workflows/implement/write-body.ts")} ${shq(digest(body))} ${shq(bodyFile)}`,
        set: { extract_exit: "exit", extract_out: "out" },
      },
      {
        sh: `node -e ${shq(DIGEST_JS)} ${shq(bodyFile)}`,
        when: { extract_exit: 0 },
        set: { body_digest: "out" },
      },
    ],
  },
  { extra: `\nThe lines between PR_BODY_B64_BEGIN and PR_BODY_B64_END are data that the command of a step reads. Do not copy, decode, or run them.\n${bodyData}` },
);
const readHeld =
  Boolean(readBack) && readBack.extract_exit === 0 && sameBody(readBack.body_digest, body);
published.body_transport = readHeld ? "transcript" : "copied";
let bodyWritten = readHeld;
if (!readHeld) {
  // Why the read-back did not hold goes into the return value and the run row. copied on Claude Code means the
  // transcript moved or changed shape.
  const fallbackReason = () => {
    if (!readBack) return "the read-back agent returned no result";
    if (readBack.extract_exit !== 0)
      return `write-body.ts exited ${readBack.extract_exit}: ${String(readBack.extract_out).trim().slice(0, 300)}`;
    return `the digest of the file read back differed from the generated body (${readBack.body_digest})`;
  };
  published.body_fallback = fallbackReason();
  log(`The PR body was not read back from the transcript (${published.body_fallback}). An agent copies the base64.`);
  const writeBlock = [
    `base64 -d > ${shq(bodyFile)} <<'PR_BODY_B64'`,
    ...base64Lines(body),
    "PR_BODY_B64",
  ].join("\n");
  const copied = await agent(
    `Write the PR body to a file and return its digest. Copy the base64 lines unchanged; do not decode, re-wrap, or edit them. Do not summarize or judge.\n` +
      `1. Run the block below as one Bash call, exactly as written, and put its exit code in write_exit.\n` +
      "```sh\n" +
      writeBlock +
      "\n```\n" +
      `2. \`node -e ${shq(DIGEST_JS)} ${shq(bodyFile)}\`: put its stdout in body_digest.`,
    {
      label: "body-copy",
      phase: "Ship",
      agentType: "general-purpose",
      schema: closed({ write_exit: int, body_digest: str }),
      // This role copies a few KB of base64 without dropping a character, so sonnet takes it rather than haiku.
      model: "sonnet",
    },
  );
  bodyWritten =
    Boolean(copied) && copied.write_exit === 0 && sameBody(copied.body_digest, body);
}
if (!bodyWritten) {
  return await shipStop(
    "pr-body-mismatch",
    `The written PR body differs from the generated body (${bodyFile}). Nothing has been published.`,
    { retry_next: retryNext("ship") },
  );
}

// pushArguments in Codex's target.ts pushes through a command-scoped remote URL and a replaced credential helper.
// Claude Code's auto mode denies that shape as a remote repoint, so the push goes to the configured remote Target verified.
// In its place, right before the push, every effective push URL, after insteadOf and pushInsteadOf, must point at repository.
const probe = await relay("push-target", "Ship", {
  defaults: { push_url: "", effective_url: "" },
  steps: [
    {
      sh: inWorktree("remote", "get-url", "--push", "--all", remote),
      cwd: repo,
      set: { push_url: "out" },
    },
    { sh: inWorktree("ls-remote", "--get-url", remote), cwd: repo, set: { effective_url: "out" } },
  ],
});
const pointsAtRepository = (url) => (REMOTE_URL.exec(url.trim()) || [])[1] === repository;
const pushUrls = String((probe && probe.push_url) || "")
  .split("\n")
  .filter((line) => line.trim());
if (
  !probe ||
  !pushUrls.length ||
  !pushUrls.every(pointsAtRepository) ||
  !pointsAtRepository(String(probe.effective_url))
) {
  return await shipStop(
    "push-target-mismatch",
    `The effective push target of remote ${remote} does not point at ${repository}. Check git's insteadOf settings. Nothing has been pushed.`,
  );
}
const pushed = await relay("push", "Ship", {
  defaults: { push_exit: -1, push_tail: "", remote_sha: "" },
  steps: [
    {
      sh: inWorktree("push", "--no-follow-tags", remote, `${branch}:refs/heads/${branch}`),
      cwd: repo,
      timeout_ms: 300000,
      set: { push_exit: "exit", push_tail: "fail_tail:20" },
    },
    {
      sh: `out=$(${inWorktree("ls-remote", remote, `refs/heads/${branch}`)}) && printf %s "$out" | cut -f 1`,
      cwd: repo,
      set: { remote_sha: "out" },
    },
  ],
});
const remoteSha = String((pushed && pushed.remote_sha) || "")
  .trim()
  .split(/\s/)[0];
if (!pushed || pushed.push_exit !== 0 || remoteSha !== published.commit) {
  return await shipStop(
    "push-unconfirmed",
    `Could not confirm that the remote ${branch} points at commit ${published.commit}. Check the remote branch before any further write. The run does not push again automatically.`,
    { push_tail: (pushed && pushed.push_tail) || "" },
  );
}
const PR_URL_SHAPE = new RegExp(
  `^https://github\\.com/${escapeRegExp(repository)}/pull/[1-9]\\d*$`,
);
// A fresh run opens the draft PR once. A revision opens none; per the revision path in publish.ts, it only rewrites the body.
const openPr = async () => {
  const created = await relay("create", "Ship", {
    defaults: { create_exit: -1, url: "", create_tail: "" },
    steps: [
      {
        sh: argvLine(["gh", "pr", "create", "--draft", "--repo", repository, "--base", baseBranch, "--head", branch, "--title", issue.title, "--body-file", bodyFile]),
        cwd: repo,
        set: { create_exit: "exit", url: "last", create_tail: "fail_tail:20" },
      },
    ],
  });
  const url = String((created && created.url) || "").trim();
  return created && created.create_exit === 0 && PR_URL_SHAPE.test(url)
    ? { url }
    : {
        stop: "publication-unconfirmed",
        why: "The result of opening the PR is unknown. Check the actual PR on GitHub before any further write. The run does not open it again automatically.",
        fields: { url, create_tail: (created && created.create_tail) || "" },
      };
};
const rewriteBody = async () => {
  const edited = await relay("edit-body", "Ship", {
    defaults: { edit_exit: -1, edit_tail: "" },
    steps: [
      {
        sh: argvLine(["gh", "pr", "edit", revisionUrl, "--repo", repository, "--body-file", bodyFile]),
        cwd: repo,
        set: { edit_exit: "exit", edit_tail: "fail_tail:20" },
      },
    ],
  });
  return edited && edited.edit_exit === 0
    ? { url: revisionUrl }
    : {
        stop: "publication-unconfirmed",
        why: "Unknown whether the PR body was rewritten. Check the body on GitHub before any further write. The run does not rewrite it again automatically.",
        fields: { url: revisionUrl, edit_tail: (edited && edited.edit_tail) || "" },
      };
};
const opened = revising ? await rewriteBody() : await openPr();
if (opened.stop) return await shipStop(opened.stop, opened.why, opened.fields);
published.url = opened.url;
// Canonical source: checkPublishedPr in publish.ts and matchPrPublication in pr-identity.ts.
// The agent returns only the fields the checks read, with the body replaced by its digest.
const PROJECT_JS =
  `const digest = ${DIGEST_SRC}; const p = JSON.parse(require("fs").readFileSync(0, "utf8")); ` +
  `const at = (o, k) => (o && typeof o === "object" ? o[k] : undefined); ` +
  `console.log(JSON.stringify({ state: p.state, draft: p.draft, html_url: p.html_url, user: { login: at(p.user, "login") }, ` +
  `head: { sha: at(p.head, "sha"), ref: at(p.head, "ref"), repo: { full_name: at(at(p.head, "repo"), "full_name") } }, ` +
  `base: { ref: at(p.base, "ref"), repo: { full_name: at(at(p.base, "repo"), "full_name") } }, ` +
  `body: typeof p.body === "string" ? digest(p.body) : null }))`;
const readback = await relay("readback", "Ship", {
  defaults: { readback_exit: -1, pr_json: "" },
  steps: [
    {
      sh: `gh api ${shq(`repos/${repository}/pulls/${published.url.split("/").at(-1)}`)} | node -e ${shq(PROJECT_JS)}`,
      cwd: repo,
      set: { readback_exit: "exit", pr_json: "out" },
    },
  ],
});
const pr = readback && readback.readback_exit === 0 ? parseJsonText(readback.pr_json) : null;
const pick = (value, ...keys) =>
  keys.reduce((v, key) => (v && typeof v === "object" ? v[key] : undefined), value);
const PUBLICATION_CHECKS = [
  ["state", (p) => p.state === "open"],
  ["draft", (p) => p.draft === true],
  ["url", (p) => p.html_url === published.url],
  ["author", (p) => pick(p, "user", "login") === actor],
  ["head", (p) => pick(p, "head", "sha") === published.commit && pick(p, "head", "ref") === branch],
  ["head repository", (p) => pick(p, "head", "repo", "full_name") === repository],
  [
    "base",
    (p) =>
      pick(p, "base", "ref") === baseBranch && pick(p, "base", "repo", "full_name") === repository,
  ],
  ["body", (p) => sameBody(p.body, body)],
];
const differing =
  pr && typeof pr === "object"
    ? PUBLICATION_CHECKS.filter(([, ok]) => !ok(pr)).map(([name]) => name)
    : ["readback"];
if (differing.length) {
  return await shipStop(
    "publication-unconfirmed",
    `The published PR does not match what this run opened (${differing.join(", ")}). Reconcile it on GitHub before any further write.`,
  );
}

if (media.length) {
  const attached = await relay("attach", "Ship", {
    defaults: { attach_exit: -1, attach_tail: "" },
    steps: [
      {
        sh: argvLine(["gh", "pr", "edit", published.url, "--repo", repository, ...media.flatMap((item) => ["--attach", `${worktree}/${item}`])]),
        cwd: repo,
        timeout_ms: 300000,
        set: { attach_exit: "exit", attach_tail: "fail_tail:20" },
      },
    ],
  });
  if (!attached || attached.attach_exit !== 0) {
    return await shipStop(
      "attach-failed",
      "Could not confirm the media attachment. Check the PR's attachments before any further write. The run does not attach again automatically.",
      { attach_tail: (attached && attached.attach_tail) || "" },
    );
  }
}
// ---- CI: canonical source is waitForCi in ci.ts. Wait for CI on the same head; the script classifies it ----
phase("CI");
// Codex waits within a 540-second budget. Here one wait fits 540 seconds, inside the Bash tool's
// cap, and a round count bounds the waits in case one returns early before checks register.
const CI_WAIT_ROUNDS = 6;
// --jq replaces the body with whether it still carries the Issue reference, so the body itself is never transcribed.
const CI_FIELDS = "url,headRefOid,baseRefName,state,isDraft,body,statusCheckRollup";
const checkState = (value) => {
  if (!value) return undefined;
  if (value.status === undefined) return value.state;
  return value.status === "COMPLETED" ? value.conclusion : "PENDING";
};
// Canonical source: checkStatus in ci.ts. A required SKIPPED or NEUTRAL check does not count as a success.
const checkStatus = (values) => {
  const checks = values.map((value) => ({
    name: value && (value.name ?? value.context),
    state: checkState(value),
  }));
  if (checks.some((c) => typeof c.name !== "string" || typeof c.state !== "string")) return null;
  const required = config.ciChecks;
  const failed = checks.filter(
    ({ name, state }) =>
      !["SUCCESS", "SKIPPED", "NEUTRAL", "PENDING"].includes(state) ||
      (required.includes(name) && ["SKIPPED", "NEUTRAL"].includes(state)),
  );
  const missing = required.filter((name) => !checks.some((c) => c.name === name));
  const running = checks.filter((c) => c.state === "PENDING");
  const status = failed.length
    ? "failed"
    : missing.length
      ? "missing"
      : running.length
        ? "running"
        : "passed";
  return {
    status,
    checks,
    missing,
    running: running.map((c) => c.name),
    failed: failed.map((c) => c.name),
  };
};
// Canonical source: parseTarget in ci.ts. A PR on another head or base, no longer a draft, or missing the Issue reference cannot confirm this commit's CI.
const ciTargetHeld = (view) =>
  view.headRefOid === published.commit &&
  view.baseRefName === baseBranch &&
  view.state === "OPEN" &&
  view.isDraft === true &&
  view.url === published.url &&
  view.body === true;
const observeCi = (viewed) => {
  if (!viewed || viewed.view_exit !== 0) return { status: "unavailable" };
  const view = parseJsonText(viewed.view_json);
  if (!view || typeof view !== "object") return { status: "invalid_response" };
  if (!ciTargetHeld(view)) return { status: "target_changed", head: view.headRefOid };
  const observed = Array.isArray(view.statusCheckRollup)
    ? checkStatus(view.statusCheckRollup)
    : null;
  return observed || { status: "invalid_response" };
};
const CI_STOPS = {
  failed: [
    "ci-failed",
    "CI failed, or a required check did not conclude SUCCESS. The PR stays a draft. Read the failing check's log and fix the cause.",
  ],
  target_changed: [
    "ci-target-changed",
    "The PR's head, base, OPEN and draft state, or Issue reference changed from what was published. Reconcile it before judging CI.",
  ],
  unavailable: [
    "ci-unavailable",
    "Could not read the PR and CI. Check gh's authentication, permissions, and connectivity. CI is unconfirmed, not a code failure.",
  ],
  invalid_response: [
    "ci-invalid-response",
    "The PR and CI response has an unexpected shape. Inspect the raw response before judging this commit again.",
  ],
};
let ci = null;
while (counts.ci_rounds < CI_WAIT_ROUNDS) {
  counts.ci_rounds += 1;
  const viewed = await relay(`ci:${counts.ci_rounds}`, "CI", {
    defaults: { view_exit: -1, view_json: "" },
    steps: [
    // The first step runs only to wait, and its result is not used.
      {
        sh: argvLine(["gh", "pr", "checks", published.url, "--repo", repository, "--watch", "--interval", "10"]),
        cwd: repo,
        timeout_ms: 520000,
      },
      {
        sh: argvLine(["gh", "pr", "view", published.url, "--repo", repository, "--json", CI_FIELDS, "--jq", `.body |= test("Closes #${issueNumber}([^0-9]|$)")`]),
        cwd: repo,
        timeout_ms: 60000,
        set: { view_exit: "exit", view_json: "out" },
      },
    ],
  });
  ci = observeCi(viewed);
  if (CI_STOPS[ci.status]) {
    const [reason, why] = CI_STOPS[ci.status];
    return await shipStop(reason, why, { ci });
  }
  if (ci.status === "passed") break;
}
if (!ci || ci.status !== "passed") {
  return await shipStop(
    "ci-timed-out",
    `After ${CI_WAIT_ROUNDS} waits, the required checks had not all succeeded. The PR stays a draft. Do not resume this run; check the registered and running checks.`,
    { ci },
  );
}

await recordRun("published_draft");
return {
  status: "published_draft",
  why: "The verified commit was published as a draft PR, and CI on the same head passed.",
  ...verified,
  ...published,
  media,
  ci,
  ...counts,
  run_id: runId,
  // Canonical source: remaining in orchestrator.ts. The switch to ready and the human's judgment stay outside this workflow.
  remaining: [
    ...(media.length ? ["rendered_media_check"] : []),
    "published_body_check",
    "mark_ready",
    "human_review",
  ],
};
